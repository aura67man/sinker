import { GAME_NAME } from '../config';
import { depthForPoints, totalScore, type RoundResult } from './scoring';
import { TIERS } from './tiers';

const fmt = (n: number) => n.toLocaleString('en-AU');

/**
 * Spoiler-free share text:
 *
 *   SINKER #42 — 525 pts · 5,250 m
 *   🦑🌟🐟🫧🏮🦑⬛
 *
 * `label` is the bit after the game name: "#42", "∞ #7", etc.
 */
export function buildShareText(label: string, results: readonly RoundResult[]): string {
  const total = totalScore(results);
  const grid = results.map((r) => TIERS[r.outcome].emoji).join('');
  return `${GAME_NAME} ${label} — ${fmt(total)} pts · ${fmt(depthForPoints(total))} m\n${grid}`;
}
