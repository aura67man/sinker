/**
 * Checks every prompt file in src/data/prompts (and pack folders, once they exist).
 *
 *   npm run validate              → summary table + all errors and warnings
 *   npm run validate -- --quiet   → errors only, plus the summary table
 *
 * Exits with code 1 if any file has errors (so CI fails), 0 otherwise.
 * Warnings (fuzzy collisions, thin lists) never fail the run.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePack, validatePrompt, type ValidationReport } from '../src/logic/validate';
import { TIER_ORDER, TIERS } from '../src/logic/tiers';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const dataDir = join(root, 'src', 'data');
const quiet = process.argv.includes('--quiet');

/** All .json files under a folder, recursively. */
function jsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return jsonFiles(full);
    return name.endsWith('.json') && name !== 'pack.json' && !name.startsWith('_') ? [full] : [];
  });
}

const files = [...jsonFiles(join(dataDir, 'prompts')), ...jsonFiles(join(dataDir, 'packs'))];
const reports: (ValidationReport & { file: string })[] = [];
const seenIds = new Map<string, string>();

for (const file of files) {
  const rel = relative(root, file);
  const id = basename(file, '.json');
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    reports.push({
      file: rel,
      id,
      errors: [`invalid JSON: ${(err as Error).message}`],
      warnings: [],
      tierCounts: Object.fromEntries(TIER_ORDER.map((t) => [t, 0])) as ValidationReport['tierCounts'],
      answerCount: 0,
    });
    continue;
  }
  const report = validatePrompt(raw, id);
  if (seenIds.has(id)) report.errors.push(`duplicate prompt id, also used by ${seenIds.get(id)}`);
  seenIds.set(id, rel);
  reports.push({ ...report, file: rel });
}

// ── Pack manifests ───────────────────────────────────────────────────────────
const packsDir = join(dataDir, 'packs');
if (existsSync(packsDir)) {
  for (const folder of readdirSync(packsDir)) {
    const manifest = join(packsDir, folder, 'pack.json');
    if (!existsSync(manifest)) continue;
    const ids = jsonFiles(join(packsDir, folder)).map((f) => basename(f, '.json'));
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(manifest, 'utf8'));
    } catch (err) {
      raw = null;
    }
    reports.push({ ...validatePack(raw, folder, ids), file: relative(root, manifest) });
  }
}

// ── Summary table ────────────────────────────────────────────────────────────
const cols = TIER_ORDER.map((t) => TIERS[t].emoji);
const idWidth = Math.max(10, ...reports.map((r) => r.id.length));
console.log(`\n${'prompt'.padEnd(idWidth)}  total  ${cols.map((c) => c.padStart(4)).join(' ')}   status`);
console.log('─'.repeat(idWidth + 52));
for (const r of reports) {
  const counts = TIER_ORDER.map((t) => String(r.tierCounts[t]).padStart(3)).join('  ');
  const status = r.errors.length ? `✗ ${r.errors.length} err` : r.warnings.length ? `⚠ ${r.warnings.length} warn` : '✓';
  console.log(`${r.id.padEnd(idWidth)}  ${String(r.answerCount).padStart(5)}   ${counts}    ${status}`);
}

// ── Details ──────────────────────────────────────────────────────────────────
for (const r of reports) {
  const lines = [...r.errors.map((e) => `  ✗ ${e}`), ...(quiet ? [] : r.warnings.map((w) => `  ⚠ ${w}`))];
  if (lines.length) console.log(`\n${r.file}\n${lines.join('\n')}`);
}

const errorCount = reports.reduce((n, r) => n + r.errors.length, 0);
const warningCount = reports.reduce((n, r) => n + r.warnings.length, 0);
const answerCount = reports.reduce((n, r) => n + r.answerCount, 0);
console.log(
  `\n${reports.length} prompts · ${answerCount} answers · ${errorCount} errors · ${warningCount} warnings\n`,
);
process.exit(errorCount ? 1 : 0);
