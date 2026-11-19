/**
 * Content checks for prompt files. Pure, so it's testable; the CLI wrapper
 * lives in scripts/validate-data.ts.
 *
 * Errors break the game and fail the script. Warnings are things a human
 * should look at (fuzzy collisions, thin answer lists).
 */
import { damerauLevenshtein, fuzzyThreshold } from './distance';
import { keysForAnswer } from './match';
import { TIER_IDS, isTierId, type TierId } from './tiers';
import { CATEGORIES, type Prompt } from './types';

export const MIN_ANSWERS = 40;
export const MAX_ANSWERS = 150;
/** "Only a handful of Abyssal answers" per prompt. */
export const MAX_ABYSSAL = 6;

export interface ValidationReport {
  id: string;
  errors: string[];
  warnings: string[];
  tierCounts: Record<TierId, number>;
  answerCount: number;
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

export function validatePrompt(raw: unknown, fileId: string): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tierCounts = Object.fromEntries(TIER_IDS.map((t) => [t, 0])) as Record<TierId, number>;
  const report: ValidationReport = { id: fileId, errors, warnings, tierCounts, answerCount: 0 };

  if (typeof raw !== 'object' || raw === null) {
    errors.push('file is not a JSON object');
    return report;
  }
  const p = raw as Partial<Prompt> & Record<string, unknown>;

  if (p.id !== fileId) errors.push(`id "${String(p.id)}" does not match file name "${fileId}"`);
  if (typeof p.prompt !== 'string' || !p.prompt.trim()) errors.push('missing "prompt" text');
  if (!(CATEGORIES as readonly unknown[]).includes(p.category)) {
    errors.push(`category "${String(p.category)}" is not one of: ${CATEGORIES.join(', ')}`);
  }
  if (p.qualifiers !== undefined && !isStringArray(p.qualifiers)) errors.push('"qualifiers" must be a list of strings');
  if (!Array.isArray(p.answers) || p.answers.length === 0) {
    errors.push('"answers" must be a non-empty list');
    return report;
  }

  // Per-answer shape checks.
  const answers = p.answers;
  report.answerCount = answers.length;
  answers.forEach((a, i) => {
    const where = `answer #${i + 1} (${typeof a?.name === 'string' ? a.name : '?'})`;
    if (typeof a?.name !== 'string' || !a.name.trim()) errors.push(`${where}: missing name`);
    if (a?.aliases !== undefined && !isStringArray(a.aliases)) errors.push(`${where}: aliases must be strings`);
    if (!isTierId(a?.tier)) errors.push(`${where}: unknown tier "${String(a?.tier)}"`);
    else tierCounts[a.tier]++;
    if (typeof a?.fact !== 'string' || !a.fact.trim()) errors.push(`${where}: missing fact`);
  });
  if (errors.length) return report;

  // Exactly one gem.
  if (tierCounts.gem !== 1) errors.push(`needs exactly one gem, found ${tierCounts.gem}`);

  // No two answers may share a name or alias (after normalising).
  const owner = new Map<string, string>();
  const keyed: { key: string; name: string }[] = [];
  for (const a of answers) {
    const keys = keysForAnswer(a);
    if (keys.length === 0) errors.push(`"${a.name}" normalises to nothing`);
    for (const key of keys) {
      const prev = owner.get(key);
      if (prev && prev !== a.name) errors.push(`"${a.name}" and "${prev}" both match "${key}"`);
      else if (!prev) {
        owner.set(key, a.name);
        keyed.push({ key, name: a.name });
      }
    }
  }

  // Keys from *different* answers within fuzzy range of each other: a typo of
  // one could be suggested as the other, or (on a tie) get no suggestion.
  for (let i = 0; i < keyed.length; i++) {
    for (let j = i + 1; j < keyed.length; j++) {
      const a = keyed[i];
      const b = keyed[j];
      if (a.name === b.name) continue;
      const threshold = fuzzyThreshold(Math.min(a.key.length, b.key.length));
      if (threshold === 0) continue;
      const d = damerauLevenshtein(a.key, b.key, threshold);
      if (d <= threshold) {
        warnings.push(`fuzzy collision: "${a.key}" (${a.name}) ~ "${b.key}" (${b.name}), distance ${d}`);
      }
    }
  }

  if (answers.length < MIN_ANSWERS) warnings.push(`only ${answers.length} answers (aim for ${MIN_ANSWERS}+)`);
  if (answers.length > MAX_ANSWERS) warnings.push(`${answers.length} answers (spec max is ${MAX_ANSWERS})`);
  if (tierCounts.abyssal > MAX_ABYSSAL) warnings.push(`${tierCounts.abyssal} Abyssal answers (keep it to a handful)`);
  if (tierCounts.shallows === 0) warnings.push('no Shallows answers: where are the obvious ones?');

  return report;
}

/**
 * Checks a pack manifest (packs/<id>/pack.json) against the prompt files in
 * its folder. A chapter must list exactly seven prompts, or none at all
 * (none = "coming soon").
 */
export function validatePack(raw: unknown, folderId: string, promptIdsInFolder: readonly string[]): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tierCounts = Object.fromEntries(TIER_IDS.map((t) => [t, 0])) as Record<TierId, number>;
  const report: ValidationReport = { id: `${folderId}/pack`, errors, warnings, tierCounts, answerCount: 0 };
  const p = raw as Record<string, unknown> | null;
  if (!p || typeof p !== 'object') {
    errors.push('pack.json is not an object');
    return report;
  }
  if (p.id !== folderId) errors.push(`pack id "${String(p.id)}" does not match folder "${folderId}"`);
  for (const key of ['title', 'short', 'blurb']) {
    if (typeof p[key] !== 'string' || !(p[key] as string).trim()) errors.push(`missing "${key}"`);
  }
  if (p.theme !== 'ocean' && p.theme !== 'pitch') errors.push(`theme must be "ocean" or "pitch"`);
  if (!Array.isArray(p.chapters) || p.chapters.length === 0) {
    errors.push('"chapters" must be a non-empty list');
    return report;
  }
  const inFolder = new Set(promptIdsInFolder);
  const used = new Set<string>();
  (p.chapters as { title?: unknown; promptIds?: unknown }[]).forEach((ch, i) => {
    const where = `chapter ${i + 1}`;
    if (typeof ch?.title !== 'string' || !ch.title.trim()) errors.push(`${where}: missing title`);
    if (!Array.isArray(ch?.promptIds)) {
      errors.push(`${where}: promptIds must be a list`);
      return;
    }
    const ids = ch.promptIds as string[];
    if (ids.length !== 0 && ids.length !== 7) errors.push(`${where}: needs 7 prompts (or 0 for coming soon), has ${ids.length}`);
    for (const id of ids) {
      if (!inFolder.has(id)) errors.push(`${where}: no prompt file "${id}.json" in this pack`);
      if (used.has(id)) errors.push(`${where}: "${id}" is used in more than one chapter`);
      used.add(id);
    }
  });
  for (const id of promptIdsInFolder) if (!used.has(id)) warnings.push(`"${id}" isn't in any chapter yet`);
  return report;
}
