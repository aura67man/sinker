/**
 * Rarity tiers, their scoring, and the end-of-dive verdicts.
 *
 * The jumps are deliberately uneven: Shoal → Twilight doubles your points,
 * Abyssal → Gem only adds 15. Rarity is preset in the prompt data; nothing
 * here looks at what other players typed.
 */

export const TIER_IDS = ['shallows', 'red-herring', 'shoal', 'twilight', 'abyssal', 'gem'] as const;

/** A tier an answer can be filed under in the data. */
export type TierId = (typeof TIER_IDS)[number];

/** A round outcome: a tier, or a miss (time ran out). */
export type Outcome = TierId | 'miss';

export interface TierInfo {
  id: Outcome;
  label: string;
  points: number;
  emoji: string;
  /** One dry line shown on the reveal screen. */
  flavour: string;
}

export const TIERS: Record<Outcome, TierInfo> = {
  shallows: {
    id: 'shallows',
    label: 'Shallows',
    points: 10,
    emoji: '🫧',
    flavour: 'Ankle-deep. The whole beach is in here with you.',
  },
  'red-herring': {
    id: 'red-herring',
    label: 'Red Herring',
    points: 15,
    emoji: '🎣',
    flavour: 'You took the bait. So did everyone else.',
  },
  shoal: {
    id: 'shoal',
    label: 'Shoal',
    points: 30,
    emoji: '🐟',
    flavour: 'Safety in numbers. Respectable swimming.',
  },
  twilight: {
    id: 'twilight',
    label: 'Twilight',
    points: 60,
    emoji: '🦑',
    flavour: 'The light gives up around here. You kept going.',
  },
  abyssal: {
    id: 'abyssal',
    label: 'Abyssal',
    points: 85,
    emoji: '🏮',
    flavour: 'Hardly anyone has been this far down.',
  },
  gem: {
    id: 'gem',
    label: 'Trench Gem',
    points: 100,
    emoji: '🌟',
    flavour: 'The one we hid on the bottom. You found it.',
  },
  miss: {
    id: 'miss',
    label: 'Lost Signal',
    points: 0,
    emoji: '⬛',
    flavour: 'Nothing came back on the sonar.',
  },
};

/** Tiers from shallowest to deepest, for legends and charts. */
export const TIER_ORDER: readonly TierId[] = TIER_IDS;

export function isTierId(value: unknown): value is TierId {
  return typeof value === 'string' && (TIER_IDS as readonly string[]).includes(value);
}

export interface Verdict {
  /** Inclusive lower bound of the total score. */
  min: number;
  tier: TierId;
  label: string;
  line: string;
}

/** End-of-dive verdicts, highest bound first. */
export const VERDICTS: readonly Verdict[] = [
  { min: 450, tier: 'gem', label: 'Trench Gem', line: 'Scraping the trench floor. Frankly unreasonable.' },
  { min: 351, tier: 'abyssal', label: 'Abyssal', line: 'The hull is creaking. Properly deep work.' },
  { min: 251, tier: 'twilight', label: 'Twilight', line: 'Below the light line. Nicely done.' },
  { min: 151, tier: 'shoal', label: 'Shoal', line: 'Middle of the pack, and comfy there.' },
  { min: 0, tier: 'shallows', label: 'Shallows', line: "You can still see the barge. There's a lot of ocean left." },
];
