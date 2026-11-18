import { describe, expect, it } from 'vitest';
import { dateKeyAt, dateKeyForDive, dealDive, diveNumberFor, nextMidnight } from './daily';
import { hashString, rngFromString, seededShuffle } from './random';

const pool = Array.from({ length: 30 }, (_, i) => `prompt-${String(i).padStart(2, '0')}`);

describe('seeded RNG', () => {
  it('is deterministic for the same seed', () => {
    const a = rngFromString('hello');
    const b = rngFromString('hello');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('differs between seeds', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
  });
  it('shuffle keeps every item exactly once', () => {
    const out = seededShuffle(pool, rngFromString('x'));
    expect(out).toHaveLength(pool.length);
    expect([...out].sort()).toEqual(pool);
  });
});

describe('dates and dive numbers', () => {
  it('launch date is Dive #1', () => {
    expect(diveNumberFor('2026-11-18', '2026-11-18')).toBe(1);
    expect(diveNumberFor('2026-11-19', '2026-11-18')).toBe(2);
    expect(diveNumberFor('2027-01-01', '2026-11-18')).toBe(45);
  });
  it('round-trips dive number ↔ date', () => {
    expect(dateKeyForDive(45, '2026-11-18')).toBe('2027-01-01');
  });
  it('uses the configured timezone, not UTC', () => {
    // 2026-11-18 14:00 UTC is already 01:00 on the 19th in Sydney (UTC+11 in summer).
    const instant = Date.UTC(2026, 10, 18, 14, 0);
    expect(dateKeyAt(instant, 'Australia/Sydney')).toBe('2026-11-19');
    expect(dateKeyAt(instant, 'UTC')).toBe('2026-11-18');
  });
  it('finds the next local midnight', () => {
    // 10:00 Sydney time on 2026-11-18 → midnight starting the 19th = 13:00 UTC on the 18th.
    const instant = Date.UTC(2026, 10, 17, 23, 0);
    expect(nextMidnight(instant, 'Australia/Sydney')).toBe(Date.UTC(2026, 10, 18, 13, 0));
  });
  it('handles a daylight-saving switch overnight', () => {
    // Sydney DST ends 2027-04-04 at 03:00 local (UTC+11 → UTC+10).
    // From noon on the 3rd, the next midnight (start of the 4th) is still in UTC+11.
    expect(nextMidnight(Date.UTC(2027, 3, 3, 1, 0), 'Australia/Sydney')).toBe(Date.UTC(2027, 3, 3, 13, 0));
    // From noon on the 4th, the next midnight (start of the 5th) is in UTC+10.
    expect(nextMidnight(Date.UTC(2027, 3, 4, 2, 0), 'Australia/Sydney')).toBe(Date.UTC(2027, 3, 4, 14, 0));
  });
});

describe('dealDive', () => {
  it('deals the same seven prompts for the same dive', () => {
    expect(dealDive(pool, 12)).toEqual(dealDive(pool, 12));
    expect(dealDive(pool, 12)).toHaveLength(7);
  });
  it('does not depend on the order the pool is given in', () => {
    expect(dealDive([...pool].reverse(), 5)).toEqual(dealDive(pool, 5));
  });
  it('never repeats a prompt within a cycle', () => {
    // 30 prompts → 4 days per cycle (28 cards), so dives 1–4 are one cycle.
    const seen = [1, 2, 3, 4].flatMap((n) => dealDive(pool, n));
    expect(new Set(seen).size).toBe(28);
  });
  it('has no duplicates within any single dive', () => {
    for (let n = 1; n <= 60; n++) {
      expect(new Set(dealDive(pool, n)).size).toBe(7);
    }
  });
  it('reshuffles for the next cycle', () => {
    const cycle1 = [1, 2, 3, 4].flatMap((n) => dealDive(pool, n));
    const cycle2 = [5, 6, 7, 8].flatMap((n) => dealDive(pool, n));
    expect(cycle2).not.toEqual(cycle1);
  });
  it('changes with the seed', () => {
    expect(dealDive(pool, 1, 7, 'a')).not.toEqual(dealDive(pool, 1, 7, 'b'));
  });
  it('throws if the pool is too small', () => {
    expect(() => dealDive(['a', 'b'], 1)).toThrow();
  });
});
