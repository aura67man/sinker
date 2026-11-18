import { describe, expect, it } from 'vitest';
import { PREVIEW_MS, ROUND_MS } from '../config';
import { buildIndex } from './match';
import { answerTimeLeft, previewLeft, roundPhase, submitAnswer } from './round';
import type { Prompt } from './types';

const prompt: Prompt = {
  id: 't',
  prompt: 'Name a noodle dish',
  category: 'food',
  answers: [
    { name: 'Ramen', tier: 'shallows', fact: 'f' },
    { name: 'Khao soi', tier: 'gem', fact: 'f' },
  ],
};
const index = buildIndex(prompt);

describe('round timeline', () => {
  const start = 1_000_000;
  it('starts with a read-only preview', () => {
    expect(roundPhase(start, start)).toBe('preview');
    expect(previewLeft(start, start + 1000)).toBe(PREVIEW_MS - 1000);
    expect(answerTimeLeft(start, start + 1000)).toBe(ROUND_MS);
  });
  it('then gives the full answer time', () => {
    expect(roundPhase(start, start + PREVIEW_MS)).toBe('active');
    expect(answerTimeLeft(start, start + PREVIEW_MS + 5000)).toBe(ROUND_MS - 5000);
  });
  it('is over once time runs out, even if the tab was away', () => {
    expect(roundPhase(start, start + PREVIEW_MS + ROUND_MS)).toBe('over');
    expect(roundPhase(start, start + 10 * 60_000)).toBe('over');
    expect(answerTimeLeft(start, start + 10 * 60_000)).toBe(0);
  });
});

describe('submitAnswer', () => {
  it('accepts exact matches', () => {
    expect(submitAnswer('RAMEN', index, null)).toMatchObject({ kind: 'accept', answer: { name: 'Ramen' } });
  });
  it('says no echo for unknown answers', () => {
    expect(submitAnswer('lasagne', index, null)).toEqual({ kind: 'no-echo' });
  });
  it('ignores empty input', () => {
    expect(submitAnswer('  ', index, null)).toEqual({ kind: 'empty' });
  });
  it('suggests on a typo, and accepts when the same text is submitted again', () => {
    const first = submitAnswer('kao soi', index, null);
    expect(first).toMatchObject({ kind: 'suggest', answer: { name: 'Khao soi' } });
    if (first.kind !== 'suggest') throw new Error('expected suggestion');
    const pending = { input: 'kao soi', answer: first.answer };
    expect(submitAnswer('Kao Soi ', index, pending)).toMatchObject({ kind: 'accept', answer: { name: 'Khao soi' } });
  });
  it('re-checks if the text changed after a suggestion', () => {
    const pending = { input: 'kao soi', answer: prompt.answers[1] };
    expect(submitAnswer('ramen', index, pending)).toMatchObject({ kind: 'accept', answer: { name: 'Ramen' } });
    expect(submitAnswer('zzzz', index, pending)).toEqual({ kind: 'no-echo' });
  });
});
