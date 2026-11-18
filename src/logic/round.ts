/**
 * One prompt's worth of game rules: the preview → answer → done timeline,
 * and what a submission does.
 *
 * Time is always computed from a stored start timestamp, never from a
 * ticking counter, so switching tabs or reloading the page doesn't pause
 * or reset the clock.
 */
import { PREVIEW_MS, ROUND_MS } from '../config';
import { matchAnswer, sameInput, type AnswerIndex } from './match';
import type { Answer } from './types';

export type RoundPhase = 'preview' | 'active' | 'over';

export function roundPhase(startedAt: number, now: number): RoundPhase {
  const elapsed = now - startedAt;
  if (elapsed < PREVIEW_MS) return 'preview';
  if (elapsed < PREVIEW_MS + ROUND_MS) return 'active';
  return 'over';
}

/** ms left in the read-only preview (0 once it's over). */
export function previewLeft(startedAt: number, now: number): number {
  return Math.max(0, startedAt + PREVIEW_MS - now);
}

/** ms left to answer (the full ROUND_MS during the preview). */
export function answerTimeLeft(startedAt: number, now: number): number {
  return Math.max(0, Math.min(ROUND_MS, startedAt + PREVIEW_MS + ROUND_MS - now));
}

/** A typo suggestion waiting for the player to confirm. */
export interface PendingSuggestion {
  input: string;
  answer: Answer;
}

export type SubmitOutcome =
  | { kind: 'empty' }
  | { kind: 'no-echo' }
  | { kind: 'suggest'; answer: Answer }
  | { kind: 'accept'; answer: Answer };

/**
 * Decide what a submission does.
 *
 * - Submitting the same text again while a suggestion is showing confirms it.
 * - An exact name/alias match is accepted straight away.
 * - A near-miss becomes a suggestion (never auto-accepted).
 * - Anything else is "no echo"; the player can keep guessing.
 */
export function submitAnswer(
  input: string,
  index: AnswerIndex,
  pending: PendingSuggestion | null,
): SubmitOutcome {
  if (pending && sameInput(input, pending.input)) return { kind: 'accept', answer: pending.answer };
  const result = matchAnswer(input, index);
  switch (result.kind) {
    case 'empty':
      return { kind: 'empty' };
    case 'none':
      return { kind: 'no-echo' };
    case 'suggest':
      return { kind: 'suggest', answer: result.answer };
    case 'exact':
      return { kind: 'accept', answer: result.answer };
  }
}
