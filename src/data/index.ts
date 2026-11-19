/**
 * Prompt data access. Each prompt is its own JSON file, and Vite turns the
 * globs below into one lazy chunk per file, so a dive only downloads the
 * seven prompts it actually uses.
 *
 * - prompts/*.json        the daily pool (also used by Unlimited and Archive)
 * - packs/<id>/pack.json  a themed pack's manifest (title, theme, chapters)
 * - packs/<id>/*.json     that pack's own prompts, never dealt in daily dives
 */
import type { Pack } from '../logic/packs';
import type { Prompt } from '../logic/types';

const dailyLoaders = import.meta.glob<{ default: Prompt }>('./prompts/*.json');
const packLoaders = import.meta.glob<{ default: Prompt }>(['./packs/*/*.json', '!./packs/*/pack.json']);
const packManifests = import.meta.glob<Pack>('./packs/*/pack.json', { eager: true, import: 'default' });

const idFromPath = (path: string) => path.replace(/^.*\/([^/]+)\.json$/, '$1');

/** Every prompt id in the daily pool, sorted. Known without loading any JSON. */
export const DAILY_POOL_IDS: readonly string[] = Object.keys(dailyLoaders).map(idFromPath).sort();

/** All themed packs, in display order. */
const PACK_ORDER = ['words', 'movies', 'sports', 'geography', 'music', 'history', 'science', 'screen', 'food', 'australia'];
export const PACKS: readonly Pack[] = Object.values(packManifests).sort(
  (a, b) => PACK_ORDER.indexOf(a.id) - PACK_ORDER.indexOf(b.id),
);

export const packById = (id: string | undefined) => PACKS.find((p) => p.id === id);

// Prompt id → loader, across the daily pool and every pack. Ids are unique
// project-wide (the validator checks).
const loaderById = new Map<string, () => Promise<{ default: Prompt }>>();
for (const [path, loader] of [...Object.entries(dailyLoaders), ...Object.entries(packLoaders)]) {
  loaderById.set(idFromPath(path), loader);
}

const cache = new Map<string, Promise<Prompt>>();

export function loadPrompt(id: string): Promise<Prompt> {
  let pending = cache.get(id);
  if (!pending) {
    const loader = loaderById.get(id);
    if (!loader) return Promise.reject(new Error(`Unknown prompt "${id}"`));
    pending = loader().then((mod) => mod.default);
    cache.set(id, pending);
  }
  return pending;
}

export function loadPrompts(ids: readonly string[]): Promise<Prompt[]> {
  return Promise.all(ids.map(loadPrompt));
}
