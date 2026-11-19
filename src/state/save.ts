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

/** A daily dive in progress. Rounds are appended as they finish. */
export interface ActiveDive {
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
    active: null,
    settings: { ...DEFAULT_SETTINGS },
    seenHowTo: false,
    buddy: 'lanternfish',
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySave();
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.version !== VERSION) return emptySave();
    return {
      ...emptySave(),
      ...data,
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
    } as SaveData;
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
    diveNumber: active.diveNumber,
    dateKey: active.dateKey,
    promptIds: active.promptIds,
    rounds: active.rounds,
    total: totalScore(active.rounds),
    finishedAt: now,
  };
}
