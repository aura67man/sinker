/**
 * Colour schemes. Each one only swaps CSS custom properties (see the
 * html[data-palette] blocks in styles/polish.css), so adding a palette is a
 * new entry here plus one CSS block. Tier colours stay the same everywhere,
 * so a Trench Gem always looks like a Trench Gem.
 */
export type PaletteId = 'abyss' | 'reef' | 'kelp' | 'glow';

export interface Palette {
  id: PaletteId;
  name: string;
  blurb: string;
  /** Background, accent, highlight: drawn as the swatch in Settings. */
  swatch: [string, string, string];
}

export const PALETTES: Palette[] = [
  { id: 'abyss', name: 'Abyss', blurb: 'Teal and amber on deep navy. The original.', swatch: ['#050a14', '#4fd1c5', '#f5a524'] },
  { id: 'reef', name: 'Coral Reef', blurb: 'Aqua and coral, a bit brighter.', swatch: ['#06101a', '#62d8f2', '#ff8a7a'] },
  { id: 'kelp', name: 'Kelp Forest', blurb: 'Sea-green and gold.', swatch: ['#06110d', '#7fd6a0', '#e9c46a'] },
  { id: 'glow', name: 'Bioluminescence', blurb: 'Electric cyan and violet in the dark.', swatch: ['#07061a', '#6ff3ff', '#c792ff'] },
];

export const DEFAULT_PALETTE: PaletteId = 'abyss';

export function isPalette(id: unknown): id is PaletteId {
  return PALETTES.some((p) => p.id === id);
}
