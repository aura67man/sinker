/**
 * Runs the content validator over every real prompt file, so `npm test`
 * fails if someone breaks the data (two gems, missing facts, clashes...).
 * Also spot-checks matching against real answers.
 */
import { describe, expect, it } from 'vitest';
import { validatePrompt } from '../logic/validate';
import { matchInPrompt } from '../logic/match';
import { dealDive } from '../logic/daily';
import type { Prompt } from '../logic/types';
import { DAILY_POOL_IDS } from './index';

const files = import.meta.glob<Prompt>('./prompts/*.json', { eager: true, import: 'default' });
const prompts = Object.entries(files).map(([path, prompt]) => ({
  id: path.replace(/^.*\/([^/]+)\.json$/, '$1'),
  prompt,
}));
const byId = (id: string) => prompts.find((p) => p.id === id)!.prompt;

describe('prompt data', () => {
  it('has at least seven prompts in the daily pool', () => {
    expect(DAILY_POOL_IDS.length).toBeGreaterThanOrEqual(7);
  });

  it.each(prompts.map((p) => [p.id, p.prompt] as const))('%s passes validation', (id, prompt) => {
    expect(validatePrompt(prompt, id).errors).toEqual([]);
  });

  it('can deal a dive from the real pool', () => {
    expect(dealDive(DAILY_POOL_IDS, 1)).toHaveLength(7);
  });
});

describe('matching against real data', () => {
  it.each([
    ['chemical-elements', 'aluminum', 'Aluminium'],
    ['chemical-elements', 'SULPHUR', 'Sulfur'],
    ['best-picture-winners', 'godfather 2', 'The Godfather Part II'],
    ['best-picture-winners', 'kramer vs kramer', 'Kramer vs. Kramer'],
    ['african-countries', 'swaziland', 'Eswatini'],
    ['african-countries', "Cote d'Ivoire", "Côte d'Ivoire"],
    ['dog-breeds', 'sausage dog', 'Dachshund'],
    ['noodle-dishes', 'bun bo hue', 'Bún bò Huế'],
    ['australian-animals', 'bin chicken', 'Australian white ibis'],
  ])('%s: "%s" → %s', (id, input, name) => {
    expect(matchInPrompt(input, byId(id))).toMatchObject({ kind: 'exact', answer: { name } });
  });

  it('suggests rather than accepts typos', () => {
    expect(matchInPrompt('platypuss', byId('australian-animals'))).toMatchObject({
      kind: 'suggest',
      answer: { name: 'Platypus' },
    });
  });

  it('respects qualifiers by simply not listing wrong answers', () => {
    // -burgh is not -burg.
    expect(matchInPrompt('Edinburgh', byId('ville-or-burg')).kind).not.toBe('exact');
  });
});
