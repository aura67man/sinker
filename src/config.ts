/**
 * Game-wide constants. Change these here, not in the logic modules.
 */

export const GAME_NAME = 'SINKER';

/** The daily dive rolls over at local midnight in this IANA timezone. */
export const TIMEZONE = 'Australia/Sydney';

/** The calendar date (in TIMEZONE) of Dive #1. Format: YYYY-MM-DD. */
export const LAUNCH_DATE = '2026-11-18';

/** Prompts per dive. */
export const PROMPTS_PER_DIVE = 7;

/** Read-only preview before the input unlocks, in ms. */
export const PREVIEW_MS = 3_000;

/** Answering time per prompt, in ms. */
export const ROUND_MS = 25_000;

/** 1 point = 10 metres of depth, so a perfect 700 = 7,000 m. */
export const METRES_PER_POINT = 10;

/**
 * Seed for shuffling the daily prompt deck. Changing it reshuffles every
 * dive, past and future, so leave it alone once the game is live.
 */
export const DECK_SEED = 'sinker-deck-v1';
