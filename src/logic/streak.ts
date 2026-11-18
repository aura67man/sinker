/**
 * Streaks count consecutive *daily* dives completed, by dive number.
 * Unlimited and Archive dives never touch this.
 */

export interface StreakInfo {
  current: number;
  best: number;
}

/**
 * @param completed dive numbers of finished daily dives
 * @param today today's dive number
 *
 * The current streak is still alive if you haven't played today yet but did
 * play yesterday — it only breaks once a whole day is skipped.
 */
export function computeStreak(completed: Iterable<number>, today: number): StreakInfo {
  const done = new Set(completed);

  let current = 0;
  let day = done.has(today) ? today : today - 1;
  while (done.has(day)) {
    current++;
    day--;
  }

  let best = 0;
  let run = 0;
  let last = -Infinity;
  for (const n of [...done].sort((a, b) => a - b)) {
    run = n === last + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    last = n;
  }

  return { current, best };
}
