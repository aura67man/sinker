/**
 * Everything the game remembers, in one versioned localStorage entry.
 *
 * Reads and writes are wrapped in try/catch: private browsing or blocked
 * storage just means the game forgets things, it never crashes.
 */
import type { RoundResult } from '../logic/scoring';
import { totalScore } from '../logic/scoring';

const KEY = 'sinker:save';
const VERSION = 1;

/**
 * daily: today's shared dive (counts for streaks, stats and buddies).
 * unlimited: the Endless Dive, numbered, play as many as you like.
 * archive: a replay of a past daily dive.
 */
export type DiveMode = 'daily' | 'unlimited' | 'archive';

/** A dive in progress. Rounds are appended as they finish. */
export interface ActiveDive {
  mode: DiveMode;
  diveNumber: number;
  dateKey: string;
  promptIds: string[];
  rounds: RoundResult[];
  /**
   * When the current round began (ms timestamp), or null while sitting on a
   * reveal between rounds. Stored so a reload can't reset the clock.
   */
  roundStartedAt: number | null;
}

export interface FinishedDive {
  mode: DiveMode;
  diveNumber: number;
  dateKey: string;
  promptIds: string[];
  rounds: RoundResult[];
  total: number;
  finishedAt: number;
}

export type MotionSetting = 'system' | 'reduced' | 'full';

export interface Settings {
  /** Skip the sink animation entirely. */
  skipAnimations: boolean;
  motion: MotionSetting;
  /** Sound is off by default: people play this in class. */
  sound: boolean;
  /** 0–1. */
  volume: number;
  /** Low background drone that darkens with depth. */
  ambient: boolean;
  /** Stronger tier cues: patterned lines, icon pips, colour-blind-safe palette. */
  colourblind: boolean;
}

export interface SaveData {
  version: typeof VERSION;
  /** Finished daily dives, keyed by dive number. */
  daily: Record<number, FinishedDive>;
  /** Endless dives: the next number to deal, and every finished one. */
  unlimited: { next: number; history: FinishedDive[] };
  /** Latest replay of each past daily dive, keyed by dive number. */
  archive: Record<number, FinishedDive>;
  active: ActiveDive | null;
  settings: Settings;
  seenHowTo: boolean;
  /** Chosen dive buddy id (see art/creatures.ts). */
  buddy: string;
}

export const DEFAULT_SETTINGS: Settings = {
  skipAnimations: false,
  motion: 'system',
  sound: false,
  volume: 0.6,
  ambient: true,
  colourblind: false,
};

export function emptySave(): SaveData {
  return {
    version: VERSION,
    daily: {},
    unlimited: { next: 1, history: [] },
    archive: {},
    active: null,
    settings: { ...DEFAULT_SETTINGS },
    seenHowTo: false,
    buddy: 'lanternfish',
  };
}

/**
 * Fills in anything an older save is missing. Saves from before Unlimited
 * and Archive existed have no `mode` on their dives: those were all daily.
 */
export function normaliseSave(raw: unknown): SaveData {
  if (typeof raw !== 'object' || raw === null) return emptySave();
  const data = raw as Partial<SaveData>;
  if (data.version !== VERSION) return emptySave();
  const base = emptySave();
  const withMode = <T extends { mode?: DiveMode }>(d: T, mode: DiveMode) => ({ ...d, mode: d.mode ?? mode });
  const daily = Object.fromEntries(
    Object.entries(data.daily ?? {}).map(([n, d]) => [n, withMode(d, 'daily')]),
  ) as SaveData['daily'];
  return {
    ...base,
    ...data,
    daily,
    unlimited: { ...base.unlimited, ...data.unlimited },
    archive: data.archive ?? {},
    active: data.active ? (withMode(data.active, 'daily') as ActiveDive) : null,
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normaliseSave(JSON.parse(raw)) : emptySave();
  } catch {
    return emptySave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: carry on without saving.
  }
}

export function finishDive(active: ActiveDive, now: number): FinishedDive {
  return {
    mode: active.mode,
    diveNumber: active.diveNumber,
    dateKey: active.dateKey,
    promptIds: active.promptIds,
    rounds: active.rounds,
    total: totalScore(active.rounds),
    finishedAt: now,
  };
}

/** Files a finished dive in the right place for its mode. */
export function recordFinished(save: SaveData, done: FinishedDive): SaveData {
  switch (done.mode) {
    case 'daily':
      return { ...save, active: null, daily: { ...save.daily, [done.diveNumber]: done } };
    case 'unlimited':
      return {
        ...save,
        active: null,
        unlimited: { ...save.unlimited, history: [...save.unlimited.history, done] },
      };
    case 'archive':
      return { ...save, active: null, archive: { ...save.archive, [done.diveNumber]: done } };
  }
}

/** The bit after "SINKER" in share text and headers: "#42", "∞ #7", "#12 ⟲". */
export function diveLabel(mode: DiveMode, diveNumber: number): string {
  if (mode === 'unlimited') return `∞ #${diveNumber}`;
  if (mode === 'archive') return `#${diveNumber} ⟲`;
  return `#${diveNumber}`;
}
