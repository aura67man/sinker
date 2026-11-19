import { describe, expect, it } from 'vitest';
import { chapterKey, chapterStatus, nextChapter, type Pack } from './packs';
import { distanceFor, formatDistance, OCEAN, PITCH } from './theme';

const seven = (p: string) => Array.from({ length: 7 }, (_, i) => `${p}-${i}`);
const pack: Pack = {
  id: 'words',
  title: 'Words & Language',
  short: 'Words',
  blurb: '',
  theme: 'ocean',
  chapters: [
    { title: 'One', promptIds: seven('a') },
    { title: 'Two', promptIds: seven('b') },
    { title: 'Three', promptIds: [] },
  ],
};

describe('chapterStatus', () => {
  it('opens chapter 1 and locks the rest', () => {
    const none = new Set<string>();
    expect(chapterStatus(pack, 1, none)).toBe('open');
    expect(chapterStatus(pack, 2, none)).toBe('locked');
  });
  it('unlocks the next chapter once the previous one is done', () => {
    const done = new Set([chapterKey('words', 1)]);
    expect(chapterStatus(pack, 1, done)).toBe('done');
    expect(chapterStatus(pack, 2, done)).toBe('open');
  });
  it('marks unwritten chapters as coming soon, whatever the progress', () => {
    const all = new Set([chapterKey('words', 1), chapterKey('words', 2)]);
    expect(chapterStatus(pack, 3, all)).toBe('coming-soon');
    expect(chapterStatus(pack, 99, all)).toBe('coming-soon');
  });
  it('offers a next chapter only when it can be played', () => {
    const done = new Set([chapterKey('words', 1)]);
    expect(nextChapter(pack, 1, done)).toBe(2);
    expect(nextChapter(pack, 2, new Set([...done, chapterKey('words', 2)]))).toBeNull();
  });
});

describe('themes', () => {
  it('ocean: 1 point = 10 m; pitch: 1 point = 1 yd', () => {
    expect(distanceFor(100, OCEAN)).toBe(1000);
    expect(distanceFor(100, PITCH)).toBe(100);
    expect(formatDistance(345, OCEAN)).toBe('3,450 m');
    expect(formatDistance(345, PITCH)).toBe('345 yd');
  });
});
