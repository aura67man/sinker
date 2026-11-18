/**
 * "Better than X% of divers".
 *
 * ⚠️ ESTIMATE ONLY. There is no server, so we can't know what anyone else
 * scored. This models scores as a normal distribution with a hand-picked
 * mean and spread, which is a guess. Replace `estimatedPercentile` with a
 * real backend source (same interface) when one exists.
 */

export interface PercentileSource {
  /** Percentage of players (0–100) who scored below `score`. */
  percentileFor(score: number): Promise<number> | number;
  /** True when the number is modelled, not measured. */
  readonly isEstimate: boolean;
}

/** Guessed distribution of daily totals (out of 700). Tweak after playtesting. */
const ASSUMED_MEAN = 240;
const ASSUMED_SD = 95;

/** Standard normal CDF via the Abramowitz–Stegun erf approximation. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z / Math.SQRT2));
  const poly =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-((z / Math.SQRT2) ** 2));
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

export const estimatedPercentile: PercentileSource = {
  isEstimate: true,
  percentileFor(score: number) {
    const p = normalCdf((score - ASSUMED_MEAN) / ASSUMED_SD) * 100;
    // Never claim 0% or 100%: it's a guess.
    return Math.min(99, Math.max(1, Math.round(p)));
  },
};
