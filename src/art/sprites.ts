/**
 * Editable pixel art. Each sprite is a grid of characters; each character
 * maps to a colour in the sprite's palette ('.' is transparent).
 * Rendered as crisp SVG <rect>s by <PixelSprite>.
 */

export interface SpriteDef {
  palette: Record<string, string>;
  rows: string[];
}

/** Bathy: a tiny bathysphere with a face in the porthole and two amber lamps. */
export const BATHY: SpriteDef = {
  palette: {
    k: '#0b1626', // outline
    S: '#d9e2ea', // steel
    s: '#93a4b5', // steel shade
    h: '#ffffff', // highlight
    c: '#6f8399', // cable
    g: '#2fb7aa', // porthole glass
    e: '#071019', // eyes
    a: '#f5a524', // lamps
  },
  rows: [
    '......kk......',
    '......cc......',
    '......cc......',
    '....kkkkkk....',
    '..kkSSSSSSkk..',
    '.kSSSSSSSSSsk.',
    '.kShSkkkkSSsk.',
    'kShSkggggkSssk',
    'kSSSkeggekSssk',
    'kSSSkggggkSssk',
    'kSSSkggggkSssk',
    '.kSSSkkkkSSsk.',
    '.kSSSSSSSSssk.',
    '..kkSSSSssskk.',
    '...akkkkkkka..',
    '....kk..kk....',
  ],
};

/** Blink frame: same sprite with the eyes shut. */
export const BATHY_BLINK: SpriteDef = {
  ...BATHY,
  rows: BATHY.rows.map((row, i) => (i === 8 ? 'kSSSkggggkSssk' : row)),
};

/** Surface barge silhouette for the title screen (lowers Bathy on its cable). */
export const BARGE: SpriteDef = {
  palette: { k: '#120f1f', a: '#f5a524' },
  rows: [
    '..................k.............',
    '..................k.............',
    '.................kkk............',
    '..................k.k...........',
    '..................k..k..........',
    '.....kkkk.........k...k.........',
    '.....kaak.........k....k........',
    '...kkkkkkkk.......k.....k.......',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
    '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkk...',
  ],
};
