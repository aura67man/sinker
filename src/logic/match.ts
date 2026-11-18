/**
 * Answer matching.
 *
 * 1. Normalise the input (case, accents, punctuation, spaces; optional
 *    leading "the").
 * 2. Exact match against every answer name and alias → accepted.
 * 3. Otherwise fuzzy match with Damerau-Levenshtein → only ever a
 *    *suggestion*; the player has to confirm it.
 *
 * Fuzzy matching refuses to guess when two different answers are equally
 * close (e.g. "sea monkey" vs "sea donkey"), so a typo can never quietly
 * hand you the wrong answer.
 */
import { compact, matchForms, normalise } from './normalise';
import { damerauLevenshtein, fuzzyThreshold } from './distance';
import type { Answer, Prompt } from './types';

export type MatchResult =
  | { kind: 'empty' }
  | { kind: 'exact'; answer: Answer }
  | { kind: 'suggest'; answer: Answer; distance: number }
  | { kind: 'none' };

interface IndexEntry {
  /** Compacted key (no spaces). */
  key: string;
  answer: Answer;
}

export interface AnswerIndex {
  exact: Map<string, Answer>;
  entries: IndexEntry[];
}

/** Every key an answer can be matched under: its name and aliases, with and without "the". */
export function keysForAnswer(answer: Answer): string[] {
  const keys = new Set<string>();
  for (const text of [answer.name, ...(answer.aliases ?? [])]) {
    for (const form of matchForms(text)) keys.add(form);
  }
  return [...keys];
}

export function buildIndex(prompt: Prompt): AnswerIndex {
  const exact = new Map<string, Answer>();
  const entries: IndexEntry[] = [];
  for (const answer of prompt.answers) {
    for (const key of keysForAnswer(answer)) {
      // First answer wins on a clash; the validator reports clashes as errors.
      if (!exact.has(key)) exact.set(key, answer);
      entries.push({ key, answer });
    }
  }
  return { exact, entries };
}

export function matchAnswer(input: string, index: AnswerIndex): MatchResult {
  const forms = matchForms(input);
  if (forms.length === 0) return { kind: 'empty' };

  for (const form of forms) {
    const hit = index.exact.get(form);
    if (hit) return { kind: 'exact', answer: hit };
  }

  // Fuzzy pass: find the closest answer within the length-scaled threshold.
  let bestDistance = Infinity;
  let best: Answer[] = [];
  for (const form of forms) {
    for (const { key, answer } of index.entries) {
      const threshold = fuzzyThreshold(Math.min(form.length, key.length));
      if (threshold === 0) continue;
      const d = damerauLevenshtein(form, key, threshold);
      if (d > threshold) continue;
      if (d < bestDistance) {
        bestDistance = d;
        best = [answer];
      } else if (d === bestDistance && !best.includes(answer)) {
        best.push(answer);
      }
    }
  }

  // Exactly one closest answer → suggest it. A tie between different answers is too risky.
  if (best.length === 1) return { kind: 'suggest', answer: best[0], distance: bestDistance };
  return { kind: 'none' };
}

/** Convenience for one-off checks (tests, the lab page). */
export function matchInPrompt(input: string, prompt: Prompt): MatchResult {
  return matchAnswer(input, buildIndex(prompt));
}

/** True when two typed strings normalise to the same thing (used to detect "submit again to confirm"). */
export function sameInput(a: string, b: string): boolean {
  return compact(normalise(a)) === compact(normalise(b));
}
