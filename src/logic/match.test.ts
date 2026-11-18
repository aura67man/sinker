import { describe, expect, it } from 'vitest';
import { damerauLevenshtein, fuzzyThreshold } from './distance';
import { buildIndex, matchAnswer, matchInPrompt, sameInput } from './match';
import { normalise } from './normalise';
import type { Prompt } from './types';

const prompt: Prompt = {
  id: 'test',
  prompt: 'Name a thing',
  category: 'food',
  answers: [
    { name: 'Khao soi', aliases: ['khao soy'], tier: 'twilight', fact: 'f' },
    { name: 'Ramen', tier: 'shallows', fact: 'f' },
    { name: 'Pho', tier: 'red-herring', fact: 'f' },
    { name: 'The Godfather', tier: 'shoal', fact: 'f' },
    { name: 'Spider-Man', tier: 'shoal', fact: 'f' },
    { name: 'Sea monkey', tier: 'shoal', fact: 'f' },
    { name: 'Sea donkey', tier: 'abyssal', fact: 'f' },
    { name: 'Crème brûlée', tier: 'gem', fact: 'f' },
    { name: "Rock 'n' roll", tier: 'shoal', fact: 'f' },
  ],
};
const index = buildIndex(prompt);
const match = (input: string) => matchAnswer(input, index);

describe('normalise', () => {
  it('ignores case, accents, punctuation and extra spaces', () => {
    expect(normalise('  Khao-Söi! ')).toBe('khao soi');
    expect(normalise('CRÈME   BRÛLÉE')).toBe('creme brulee');
  });
  it('handles letters NFKD leaves alone', () => {
    expect(normalise('Straße')).toBe('strasse');
    expect(normalise('Smørrebrød')).toBe('smorrebrod');
  });
  it('joins apostrophes and expands ampersands', () => {
    expect(normalise("Rock'n'roll")).toBe('rocknroll');
    expect(normalise('Mac & cheese')).toBe('mac and cheese');
  });
});

describe('damerauLevenshtein', () => {
  it('counts insertions, deletions and substitutions', () => {
    expect(damerauLevenshtein('kitten', 'sitting')).toBe(3);
    expect(damerauLevenshtein('', 'abc')).toBe(3);
    expect(damerauLevenshtein('same', 'same')).toBe(0);
  });
  it('counts a swap of neighbours as one edit', () => {
    expect(damerauLevenshtein('ramne', 'ramen')).toBe(1);
    expect(damerauLevenshtein('ca', 'ac')).toBe(1);
  });
  it('bails out early past the max', () => {
    expect(damerauLevenshtein('abcdefgh', 'zzzzzzzz', 2)).toBe(3);
  });
  it('scales the threshold with length and skips short words', () => {
    expect(fuzzyThreshold(3)).toBe(0);
    expect(fuzzyThreshold(4)).toBe(1);
    expect(fuzzyThreshold(7)).toBe(2);
    expect(fuzzyThreshold(12)).toBe(3);
  });
});

describe('matchAnswer: exact', () => {
  it('accepts the name in any case/accent/punctuation', () => {
    expect(match('khao soi')).toMatchObject({ kind: 'exact', answer: { name: 'Khao soi' } });
    expect(match('KHAO-SOI!!')).toMatchObject({ kind: 'exact', answer: { name: 'Khao soi' } });
    expect(match('creme brulee')).toMatchObject({ kind: 'exact', answer: { name: 'Crème brûlée' } });
  });
  it('accepts aliases', () => {
    expect(match('Khao Soy')).toMatchObject({ kind: 'exact', answer: { name: 'Khao soi' } });
  });
  it('accepts with or without a leading "the"', () => {
    expect(match('godfather')).toMatchObject({ kind: 'exact', answer: { name: 'The Godfather' } });
    expect(match('the ramen')).toMatchObject({ kind: 'exact', answer: { name: 'Ramen' } });
  });
  it('ignores spaces and hyphens inside names', () => {
    expect(match('spiderman')).toMatchObject({ kind: 'exact', answer: { name: 'Spider-Man' } });
    expect(match('rock n roll')).toMatchObject({ kind: 'exact', answer: { name: "Rock 'n' roll" } });
  });
  it('returns empty for blank input', () => {
    expect(match('   ')).toEqual({ kind: 'empty' });
    expect(match('!!!')).toEqual({ kind: 'empty' });
  });
});

describe('matchAnswer: fuzzy', () => {
  it('only suggests, never auto-accepts, on a typo', () => {
    expect(match('ramne')).toMatchObject({ kind: 'suggest', answer: { name: 'Ramen' }, distance: 1 });
    expect(match('kao soi')).toMatchObject({ kind: 'suggest', answer: { name: 'Khao soi' } });
  });
  it('does no fuzzy matching under 4 letters', () => {
    expect(match('fo')).toEqual({ kind: 'none' });
    expect(match('phu')).toEqual({ kind: 'none' });
  });
  it('rejects things that are too far off', () => {
    expect(match('lasagne')).toEqual({ kind: 'none' });
  });
  it('picks the strictly closer of two near answers', () => {
    // One letter from "sea monkey", two from "sea donkey".
    expect(match('sea monkee')).toMatchObject({ kind: 'suggest', answer: { name: 'Sea monkey' } });
  });
  it('refuses to guess when two different answers are equally close', () => {
    // "sea ponkey" is one letter from both monkey and donkey.
    expect(match('sea ponkey')).toEqual({ kind: 'none' });
  });
  it('an exact hit on one answer beats a fuzzy hit on another', () => {
    expect(match('sea donkey')).toMatchObject({ kind: 'exact', answer: { name: 'Sea donkey' } });
  });
});

describe('helpers', () => {
  it('matchInPrompt builds its own index', () => {
    expect(matchInPrompt('pho', prompt)).toMatchObject({ kind: 'exact' });
  });
  it('sameInput compares normalised text', () => {
    expect(sameInput('Ramne ', 'ramne')).toBe(true);
    expect(sameInput('ramne', 'ramen')).toBe(false);
  });
});
