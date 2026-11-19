/**
 * Themed packs: fixed lists of chapters, each chapter a seven-prompt dive.
 * Chapters unlock in order. A chapter with fewer than seven prompts is
 * "coming soon" (the format is built to grow to 30 chapters per pack).
 */
import { PROMPTS_PER_DIVE } from '../config';
import type { ThemeId } from './theme';

export interface PackChapter {
  title: string;
  promptIds: string[];
}

export interface Pack {
  id: string;
  title: string;
  /** Short name for labels and share text, e.g. "Words". */
  short: string;
  blurb: string;
  theme: ThemeId;
  chapters: PackChapter[];
}

export type ChapterStatus = 'done' | 'open' | 'locked' | 'coming-soon';

/** Key used to store a chapter's result: "words:1". */
export const chapterKey = (packId: string, chapter: number) => `${packId}:${chapter}`;

export const isPlayable = (ch: PackChapter) => ch.promptIds.length === PROMPTS_PER_DIVE;

/**
 * @param chapter 1-based chapter number
 * @param finished set of chapter keys the player has completed
 */
export function chapterStatus(pack: Pack, chapter: number, finished: ReadonlySet<string>): ChapterStatus {
  const ch = pack.chapters[chapter - 1];
  if (!ch || !isPlayable(ch)) return 'coming-soon';
  if (finished.has(chapterKey(pack.id, chapter))) return 'done';
  if (chapter === 1 || finished.has(chapterKey(pack.id, chapter - 1))) return 'open';
  return 'locked';
}

/** The next chapter worth showing a "Next chapter" button for, if any. */
export function nextChapter(pack: Pack, chapter: number, finished: ReadonlySet<string>): number | null {
  const next = chapter + 1;
  const status = chapterStatus(pack, next, finished);
  return status === 'open' || status === 'done' ? next : null;
}
