/**
 * Which day is it, which dive number is that, and which prompts does it get.
 *
 * Everything is keyed on a calendar date ("YYYY-MM-DD") in the game's
 * configured timezone, so every player in the world gets the same dive and
 * it rolls over at that timezone's midnight.
 */
import { DECK_SEED, LAUNCH_DATE, PROMPTS_PER_DIVE, TIMEZONE } from '../config';
import { rngFromString, seededShuffle } from './random';

const DAY_MS = 86_400_000;

/** Wall-clock parts of an instant, as seen in a timezone. */
function wallClock(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** The calendar date ("YYYY-MM-DD") of an instant in a timezone. */
export function dateKeyAt(instant: number, timeZone: string = TIMEZONE): string {
  const { year, month, day } = wallClock(instant, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Days since 1970-01-01 for a "YYYY-MM-DD" key (timezone-free arithmetic). */
function epochDay(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** Inverse of epochDay. */
function dateKeyFromEpochDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** Dive number for a date: LAUNCH_DATE is Dive #1. Dates before launch give < 1. */
export function diveNumberFor(dateKey: string, launchDate: string = LAUNCH_DATE): number {
  return epochDay(dateKey) - epochDay(launchDate) + 1;
}

/** The date a dive number falls on. */
export function dateKeyForDive(diveNumber: number, launchDate: string = LAUNCH_DATE): string {
  return dateKeyFromEpochDay(epochDay(launchDate) + diveNumber - 1);
}

/** Offset of a timezone from UTC at an instant, in ms (e.g. +11h for Sydney in summer). */
function tzOffsetMs(instant: number, timeZone: string): number {
  const w = wallClock(instant, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * The instant of the next midnight in a timezone, i.e. when the next dive
 * unlocks. Handles daylight-saving changes by re-checking the offset at the
 * target time.
 */
export function nextMidnight(instant: number, timeZone: string = TIMEZONE): number {
  const tomorrow = dateKeyFromEpochDay(epochDay(dateKeyAt(instant, timeZone)) + 1);
  const [y, m, d] = tomorrow.split('-').map(Number);
  const midnightAsUtc = Date.UTC(y, m - 1, d);
  // First guess uses today's offset; second pass corrects for a DST switch overnight.
  let guess = midnightAsUtc - tzOffsetMs(instant, timeZone);
  guess = midnightAsUtc - tzOffsetMs(guess, timeZone);
  return guess;
}

/**
 * Deals the prompts for a dive from a seeded "deck".
 *
 * The whole pool is shuffled once per cycle and dealt seven a day, so no
 * prompt repeats until the deck has been used up; then the next cycle
 * reshuffles. A cycle covers floor(pool / 7) days, and leftover cards sit
 * out that cycle (they're back in the next shuffle).
 *
 * The pool is sorted by id first so the result never depends on file load
 * order. Note: adding prompts changes the deal for every dive, including
 * past ones. Finished dives store their own prompt ids, so history is safe.
 */
export function dealDive(
  poolIds: readonly string[],
  diveNumber: number,
  perDive: number = PROMPTS_PER_DIVE,
  seed: string = DECK_SEED,
): string[] {
  if (poolIds.length < perDive) {
    throw new Error(`Need at least ${perDive} prompts in the pool, got ${poolIds.length}`);
  }
  const pool = [...new Set(poolIds)].sort();
  const daysPerCycle = Math.floor(pool.length / perDive);
  const index = Math.max(0, diveNumber - 1);
  const cycle = Math.floor(index / daysPerCycle);
  const slot = index % daysPerCycle;
  const deck = seededShuffle(pool, rngFromString(`${seed}:cycle:${cycle}`));
  return deck.slice(slot * perDive, slot * perDive + perDive);
}

/** Today's dive, in one call. */
export function todaysDive(poolIds: readonly string[], now: number = Date.now()) {
  const dateKey = dateKeyAt(now);
  const diveNumber = diveNumberFor(dateKey);
  return { dateKey, diveNumber, promptIds: dealDive(poolIds, diveNumber) };
}
