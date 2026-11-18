/**
 * Prompt data access. Each prompt is its own JSON file, and Vite turns the
 * glob below into one lazy chunk per file, so a dive only downloads the
 * seven prompts it actually uses.
 */
import type { Prompt } from '../logic/types';

const loaders = import.meta.glob<{ default: Prompt }>('./prompts/*.json');

const idFromPath = (path: string) => path.replace(/^.*\/([^/]+)\.json$/, '$1');

/** Every prompt id in the daily pool, sorted. Known without loading any JSON. */
export const DAILY_POOL_IDS: readonly string[] = Object.keys(loaders).map(idFromPath).sort();

const cache = new Map<string, Promise<Prompt>>();

export function loadPrompt(id: string): Promise<Prompt> {
  let pending = cache.get(id);
  if (!pending) {
    const loader = loaders[`./prompts/${id}.json`];
    if (!loader) return Promise.reject(new Error(`Unknown prompt "${id}"`));
    pending = loader().then((mod) => mod.default);
    cache.set(id, pending);
  }
  return pending;
}

export function loadPrompts(ids: readonly string[]): Promise<Prompt[]> {
  return Promise.all(ids.map(loadPrompt));
}
