import { describe, expect, it } from 'vitest';
import { validatePrompt } from './validate';

const answer = (name: string, tier = 'shoal', extra: object = {}) => ({ name, tier, fact: 'A fact.', ...extra });

const base = (answers: object[]) => ({ id: 'demo', prompt: 'Name a thing', category: 'food', answers });

describe('validatePrompt', () => {
  it('passes a well-formed prompt', () => {
    const r = validatePrompt(base([answer('Ramen', 'shallows'), answer('Udon'), answer('Mohinga', 'gem')]), 'demo');
    expect(r.errors).toEqual([]);
    expect(r.tierCounts.gem).toBe(1);
    expect(r.tierCounts.shoal).toBe(1);
  });
  it('requires exactly one gem', () => {
    expect(validatePrompt(base([answer('A thing')]), 'demo').errors).toContain('needs exactly one gem, found 0');
    const two = validatePrompt(base([answer('Alpha', 'gem'), answer('Bravo', 'gem')]), 'demo');
    expect(two.errors).toContain('needs exactly one gem, found 2');
  });
  it('catches duplicate names and aliases across answers', () => {
    const r = validatePrompt(
      base([answer('Pho', 'gem'), answer('Phở', 'shoal'), answer('Soup', 'shoal', { aliases: ['the pho'] })]),
      'demo',
    );
    expect(r.errors.some((e) => e.includes('both match "pho"'))).toBe(true);
  });
  it('requires a fact on every answer', () => {
    const r = validatePrompt(base([answer('Ramen', 'gem'), { name: 'Udon', tier: 'shoal' }]), 'demo');
    expect(r.errors.some((e) => e.includes('missing fact'))).toBe(true);
  });
  it('rejects unknown tiers and categories, and id/file mismatches', () => {
    const r = validatePrompt({ ...base([answer('Ramen', 'legendary')]), category: 'cars', id: 'x' }, 'demo');
    expect(r.errors.some((e) => e.includes('unknown tier'))).toBe(true);
    expect(r.errors.some((e) => e.includes('category'))).toBe(true);
    expect(r.errors.some((e) => e.includes('does not match file name'))).toBe(true);
  });
  it('flags fuzzy collisions between different answers', () => {
    const r = validatePrompt(base([answer('Sea monkey', 'gem'), answer('Sea donkey')]), 'demo');
    expect(r.warnings.some((w) => w.startsWith('fuzzy collision'))).toBe(true);
  });
  it('warns about thin answer lists', () => {
    const r = validatePrompt(base([answer('Ramen', 'gem')]), 'demo');
    expect(r.warnings.some((w) => w.includes('only 1 answers'))).toBe(true);
  });
});
