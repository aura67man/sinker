import { GAME_NAME } from '../config';
import { totalScore, type RoundResult } from './scoring';
import { formatDistance, OCEAN, type Theme } from './theme';
import { TIERS } from './tiers';

/**
 * Spoiler-free share text:
 *
 *   SINKER #42 — 525 pts · 5,250 m
 *   🦑🌟🐟🫧🏮🦑⬛
 *
 * `label` is the bit after the game name: "#42", "∞ #7", "Sports 1", etc.
 */
export function buildShareText(label: string, results: readonly RoundResult[], theme: Theme = OCEAN): string {
  const total = totalScore(results);
  const grid = results.map((r) => TIERS[r.outcome].emoji).join('');
  return `${GAME_NAME} ${label} — ${total.toLocaleString('en-AU')} pts · ${formatDistance(total, theme)}\n${grid}`;
}
