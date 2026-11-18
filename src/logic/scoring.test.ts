import { describe, expect, it } from 'vitest';
import { depthForPoints, pointsFor, totalScore, verdictFor, type RoundResult } from './scoring';
import { buildShareText } from './share';
import { computeStreak } from './streak';
import { estimatedPercentile } from './percentile';
import type { Outcome } from './tiers';

const dive = (...outcomes: Outcome[]): RoundResult[] =>
  outcomes.map((outcome, i) => ({ promptId: `p${i}`, outcome }));

describe('tier points', () => {
  it('matches the spec table', () => {
    expect(pointsFor('shallows')).toBe(10);
    expect(pointsFor('red-herring')).toBe(15);
    expect(pointsFor('shoal')).toBe(30);
    expect(pointsFor('twilight')).toBe(60);
    expect(pointsFor('abyssal')).toBe(85);
    expect(pointsFor('gem')).toBe(100);
    expect(pointsFor('miss')).toBe(0);
  });
});

describe('totalScore and depth', () => {
  it('is a plain sum, no multipliers', () => {
    expect(totalScore(dive('twilight', 'gem', 'shoal', 'shallows', 'abyssal', 'twilight', 'miss'))).toBe(345);
  });
  it('a perfect dive is 700 pts = 7,000 m (the trench floor)', () => {
    const perfect = totalScore(dive('gem', 'gem', 'gem', 'gem', 'gem', 'gem', 'gem'));
    expect(perfect).toBe(700);
    expect(depthForPoints(perfect)).toBe(7000);
  });
  it('an empty or all-miss dive scores 0', () => {
    expect(totalScore([])).toBe(0);
    expect(totalScore(dive('miss', 'miss'))).toBe(0);
  });
});

describe('verdictFor', () => {
  it.each([
    [0, 'shallows'],
    [150, 'shallows'],
    [151, 'shoal'],
    [250, 'shoal'],
    [251, 'twilight'],
    [350, 'twilight'],
    [351, 'abyssal'],
    [449, 'abyssal'],
    [450, 'gem'],
    [700, 'gem'],
  ])('%i pts → %s', (total, tier) => {
    expect(verdictFor(total).tier).toBe(tier);
  });
});

describe('buildShareText', () => {
  it('formats the spoiler-free grid', () => {
    const text = buildShareText('#42', dive('twilight', 'gem', 'shoal', 'shallows', 'abyssal', 'twilight', 'miss'));
    expect(text).toBe('SINKER #42 — 345 pts · 3,450 m\n🦑🌟🐟🫧🏮🦑⬛');
  });
});

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(computeStreak([3, 4, 5], 5)).toEqual({ current: 3, best: 3 });
  });
  it("stays alive if yesterday was played but today isn't yet", () => {
    expect(computeStreak([3, 4], 5)).toEqual({ current: 2, best: 2 });
  });
  it('breaks after a skipped day', () => {
    expect(computeStreak([1, 2, 3, 6], 8)).toEqual({ current: 0, best: 3 });
  });
  it('tracks best separately from current', () => {
    expect(computeStreak([1, 2, 3, 4, 9, 10], 10)).toEqual({ current: 2, best: 4 });
  });
  it('handles no history', () => {
    expect(computeStreak([], 1)).toEqual({ current: 0, best: 0 });
  });
});

describe('estimatedPercentile', () => {
  it('is flagged as an estimate and stays within 1–99', () => {
    expect(estimatedPercentile.isEstimate).toBe(true);
    expect(estimatedPercentile.percentileFor(0)).toBe(1);
    expect(estimatedPercentile.percentileFor(700)).toBe(99);
  });
  it('rises with score', () => {
    const a = estimatedPercentile.percentileFor(200) as number;
    const b = estimatedPercentile.percentileFor(300) as number;
    expect(b).toBeGreaterThan(a);
  });
});
