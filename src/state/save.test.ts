import { describe, expect, it } from 'vitest';
import { diveLabel, emptySave, finishDive, normaliseSave, recordFinished, type ActiveDive, type SaveData } from './save';

const active = (mode: ActiveDive['mode'], diveNumber = 3): ActiveDive => ({
  mode,
  diveNumber,
  dateKey: '2026-11-20',
  promptIds: ['a'],
  rounds: [{ promptId: 'a', outcome: 'gem', answer: 'X' }],
  roundStartedAt: null,
});

describe('normaliseSave', () => {
  it('starts fresh from junk or a different version', () => {
    expect(normaliseSave(null)).toEqual(emptySave());
    expect(normaliseSave({ version: 99 })).toEqual(emptySave());
  });

  it('upgrades a Phase 2/3 save: old dives become daily, new fields get defaults', () => {
    const old = {
      version: 1,
      daily: { 2: { diveNumber: 2, dateKey: 'x', promptIds: [], rounds: [], total: 120, finishedAt: 0 } },
      active: { diveNumber: 3, dateKey: 'y', promptIds: [], rounds: [], roundStartedAt: null },
      settings: { sound: true },
      seenHowTo: true,
      buddy: 'hatchetfish',
    };
    const save = normaliseSave(old);
    expect(save.daily[2].mode).toBe('daily');
    expect(save.active?.mode).toBe('daily');
    expect(save.unlimited).toEqual({ next: 1, history: [] });
    expect(save.archive).toEqual({});
    expect(save.settings.sound).toBe(true);
    expect(save.settings.volume).toBe(0.6);
    expect(save.buddy).toBe('hatchetfish');
  });
});

describe('recordFinished', () => {
  it('files each mode separately and clears the active dive', () => {
    let save: SaveData = { ...emptySave(), active: active('daily') };
    save = recordFinished(save, finishDive(active('daily'), 1));
    save = recordFinished(save, finishDive(active('unlimited', 1), 2));
    save = recordFinished(save, finishDive(active('archive', 1), 3));
    expect(save.active).toBeNull();
    expect(Object.keys(save.daily)).toEqual(['3']);
    expect(save.unlimited.history).toHaveLength(1);
    expect(Object.keys(save.archive)).toEqual(['1']);
  });
});

describe('diveLabel', () => {
  it('labels each mode for share text', () => {
    expect(diveLabel('daily', 42)).toBe('#42');
    expect(diveLabel('unlimited', 7)).toBe('∞ #7');
    expect(diveLabel('archive', 12)).toBe('#12 ⟲');
  });
});
