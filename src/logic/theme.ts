/**
 * Visual and wording themes for a dive. The daily game is the ocean
 * (1 point = 10 m of depth). The Sports pack swaps in a football field
 * (1 point = 1 yard: a Trench Gem gains a whole 100-yard field).
 *
 * Scoring never changes between themes; only how distance is shown.
 */
import { METRES_PER_POINT } from '../config';
import { LANDMARKS, type Landmark } from './landmarks';

export type ThemeId = 'ocean' | 'pitch';

export interface Theme {
  id: ThemeId;
  /** Unit shown after distances. */
  unit: string;
  /** Distance units per point. */
  perPoint: number;
  /** HUD label for the running distance. */
  distanceLabel: string;
  /** What an answer does: "sink 300 m" / "gain 30 yd". */
  verb: string;
  /** Show final distance as negative (depth below the surface). */
  negative: boolean;
  landmarks: readonly Landmark[];
  /** Ruler: px per unit, minor/major tick spacing and length, in units. */
  ruler: { pxPerUnit: number; minor: number; major: number; max: number };
}

export const OCEAN: Theme = {
  id: 'ocean',
  unit: 'm',
  perPoint: METRES_PER_POINT,
  distanceLabel: 'depth',
  verb: 'sink',
  negative: true,
  landmarks: LANDMARKS,
  ruler: { pxPerUnit: 0.24, minor: 100, major: 500, max: 7500 },
};

export const PITCH: Theme = {
  id: 'pitch',
  unit: 'yd',
  perPoint: 1,
  distanceLabel: 'yards',
  verb: 'gain',
  negative: false,
  landmarks: [
    { depth: 100, label: 'a full field, goal line to goal line' },
    { depth: 220, label: 'a furlong, as horses race it' },
    { depth: 440, label: 'a quarter-mile' },
    { depth: 700, label: 'a perfect chapter' },
  ],
  ruler: { pxPerUnit: 2.4, minor: 10, major: 50, max: 750 },
};

export const THEMES: Record<ThemeId, Theme> = { ocean: OCEAN, pitch: PITCH };

export const themeById = (id: ThemeId | undefined): Theme => THEMES[id ?? 'ocean'] ?? OCEAN;

export function distanceFor(points: number, theme: Theme): number {
  return points * theme.perPoint;
}

export function formatDistance(points: number, theme: Theme): string {
  return `${distanceFor(points, theme).toLocaleString('en-AU')} ${theme.unit}`;
}
