import type { RoundResult } from './scoring';
import { TIER_ORDER, type Outcome } from './tiers';

export interface DiveSummary {
  total: number;
  rounds: readonly RoundResult[];
}

export interface Stats {
  played: number;
  average: number;
  best: number;
  /** How many answers landed in each tier, plus misses. */
  distribution: Record<Outcome, number>;
}

export function computeStats(dives: readonly DiveSummary[]): Stats {
  const distribution = Object.fromEntries([...TIER_ORDER, 'miss'].map((t) => [t, 0])) as Record<Outcome, number>;
  for (const dive of dives) for (const r of dive.rounds) distribution[r.outcome]++;
  const totals = dives.map((d) => d.total);
  return {
    played: dives.length,
    average: dives.length ? Math.round(totals.reduce((a, b) => a + b, 0) / dives.length) : 0,
    best: dives.length ? Math.max(...totals) : 0,
    distribution,
  };
}

/** Streak lengths that get a celebratory toast. */
export const STREAK_MILESTONES = [3, 5, 7, 14, 21, 30, 45, 60, 100] as const;
