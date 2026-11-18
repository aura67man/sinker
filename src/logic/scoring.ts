import { METRES_PER_POINT } from '../config';
import { TIERS, VERDICTS, type Outcome, type Verdict } from './tiers';

/** The stored result of one prompt in a dive. */
export interface RoundResult {
  promptId: string;
  outcome: Outcome;
  /** Canonical name of the accepted answer; absent on a miss. */
  answer?: string;
}

export function pointsFor(outcome: Outcome): number {
  return TIERS[outcome].points;
}

/** Score = the plain sum of tier values. No multipliers, no combos. */
export function totalScore(results: readonly RoundResult[]): number {
  return results.reduce((sum, r) => sum + pointsFor(r.outcome), 0);
}

export function depthForPoints(points: number): number {
  return points * METRES_PER_POINT;
}

export function verdictFor(total: number): Verdict {
  // VERDICTS is sorted highest-first, and the last entry has min 0.
  return VERDICTS.find((v) => total >= v.min) ?? VERDICTS[VERDICTS.length - 1];
}
