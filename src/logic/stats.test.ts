import { describe, expect, it } from 'vitest';
import { computeStats } from './stats';

describe('computeStats', () => {
  it('handles no history', () => {
    const s = computeStats([]);
    expect(s).toMatchObject({ played: 0, average: 0, best: 0 });
    expect(s.distribution.gem).toBe(0);
  });

  it('totals games, average, best and tier counts', () => {
    const s = computeStats([
      { total: 100, rounds: [{ promptId: 'a', outcome: 'gem' }] },
      { total: 41, rounds: [{ promptId: 'b', outcome: 'shoal' }, { promptId: 'c', outcome: 'miss' }] },
    ]);
    expect(s.played).toBe(2);
    expect(s.average).toBe(71); // 70.5 rounds to 71
    expect(s.best).toBe(100);
    expect(s.distribution).toMatchObject({ gem: 1, shoal: 1, miss: 1, shallows: 0 });
  });
});
