import type { TierId } from './tiers';

export const CATEGORIES = [
  'food',
  'animals',
  'geography',
  'words',
  'sport',
  'screen',
  'science',
  'music',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Answer {
  /** Canonical display name. */
  name: string;
  /** Other accepted spellings or names. Matched exactly, like `name`. */
  aliases?: string[];
  tier: TierId;
  /** One-line fun fact shown after the answer lands. */
  fact: string;
}

export interface Prompt {
  /** Must match the JSON file name (without .json). */
  id: string;
  /** The question, e.g. "Name a noodle dish". */
  prompt: string;
  category: Category;
  /** Small print the 3-second preview gives time to read. */
  qualifiers?: string[];
  /** Exactly one answer has tier "gem". */
  answers: Answer[];
}
