/**
 * Everything the game remembers, in one versioned localStorage entry.
 *
 * Reads and writes are wrapped in try/catch: private browsing or blocked
 * storage just means the game forgets things, it never crashes.
 */
import type { RoundResult } from '../logic/scoring';
import { totalScore } from '../logic/scoring';
import { DEFAULT_PALETTE, isPalette, type PaletteId } from './palettes';

const KEY = 'sinker:save';
const VERSION = 1;

/**
 * daily: today's shared dive (counts for streaks, stats and buddies).
 * unlimited: the Endless Dive, numbered, play as many as you like.
 * archive: a replay of a past daily dive.
 * pack: a chapter of a themed pack (diveNumber is the chapter number).
 */
export type DiveMode = 'daily' | 'unlimited' | 'archive' | 'pack';

/** A dive in progress. Rounds are appended as they finish. */
export interface ActiveDive {
  mode: DiveMode;
  diveNumber: number;
  /** Pack dives only. */
  packId?: string;
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
  /** Pack dives only. */
  packId?: string;
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
  /** Colour scheme for the interface (see state/palettes.ts). */
  palette: PaletteId;
}

export interface SaveData {
  version: typeof VERSION;
  /** Finished daily dives, keyed by dive number. */
  daily: Record<number, FinishedDive>;
  /** Endless dives: the next number to deal, and every finished one. */
  unlimited: { next: number; history: FinishedDive[] };
  /** Latest replay of each past daily dive, keyed by dive number. */
  archive: Record<number, FinishedDive>;
  /** Best result per pack chapter, keyed "packId:chapter". */
  packs: Record<string, FinishedDive>;
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
  palette: DEFAULT_PALETTE,
};

export function emptySave(): SaveData {
  return {
    version: VERSION,
    daily: {},
    unlimited: { next: 1, history: [] },
    archive: {},
    packs: {},
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
    packs: data.packs ?? {},
    active: data.active ? (withMode(data.active, 'daily') as ActiveDive) : null,
    settings: normaliseSettings(data.settings),
  };
}

function normaliseSettings(raw: Partial<Settings> | undefined): Settings {
  const settings = { ...DEFAULT_SETTINGS, ...raw };
  if (!isPalette(settings.palette)) settings.palette = DEFAULT_PALETTE;
  return settings;
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
    ...(active.packId ? { packId: active.packId } : {}),
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
    case 'pack': {
      // Keep the best attempt at each chapter.
      const key = `${done.packId}:${done.diveNumber}`;
      const prev = save.packs[key];
      const best = prev && prev.total > done.total ? prev : done;
      return { ...save, active: null, packs: { ...save.packs, [key]: best } };
    }
  }
}

/** The bit after "SINKER" in share text and headers: "#42", "∞ #7", "#12 ⟲", "Words 2". */
export function diveLabel(mode: DiveMode, diveNumber: number, packShort?: string): string {
  if (mode === 'pack') return `${packShort ?? 'Pack'} ${diveNumber}`;
  if (mode === 'unlimited') return `∞ #${diveNumber}`;
  if (mode === 'archive') return `#${diveNumber} ⟲`;
  return `#${diveNumber}`;
}
