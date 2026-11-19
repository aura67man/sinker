/**
 * Tier icons, dive buddies and scenery. Same format as sprites.ts:
 * one character per pixel, '.' is transparent, everything else maps
 * through the sprite's palette. Edit freely and check the result in
 * the lab's sprite gallery (?lab).
 */
import type { Outcome } from '../logic/tiers';
import { BATHY, type SpriteDef } from './sprites';

// ── Tier icons ───────────────────────────────────────────────────────────────

/** Shallows: a cluster of bubbles. */
const BUBBLES: SpriteDef = {
  palette: { b: '#a9d6f5', h: '#ffffff' },
  rows: [
    '......bbb..',
    '.....b.h.b.',
    '.....b...b.',
    '.bbb..bbb..',
    'b.h.b......',
    'b...b..bb..',
    '.bbb..b.hb.',
    '......b..b.',
    '.......bb..',
  ],
};

/** Red Herring: a red fish that's already on the hook. */
const HERRING: SpriteDef = {
  palette: { r: '#ff7a59', d: '#b8442c', e: '#1a0a06', h: '#d9e2ea' },
  rows: [
    '.h.........',
    '.h.........',
    '.h..rrr...r',
    'hh.rrrrrr.r',
    '.rerrrrrrrr',
    '.rrrrrrrrr.',
    '..rdrdrdr.r',
    '....rrr...r',
  ],
};

/** Shoal: a little teal schooling fish. */
const FISH: SpriteDef = {
  palette: { f: '#4fd1c5', d: '#2a8f86', e: '#04201d' },
  rows: [
    '...fff....f',
    '.fffffff.ff',
    'fefffffffff',
    'ffffffffff.',
    '.fdfdfdf.ff',
    '...fff....f',
  ],
};

/** Twilight: a squid. */
const SQUID: SpriteDef = {
  palette: { s: '#82a7ff', d: '#5571c4', e: '#0a1230' },
  rows: [
    '...s...',
    '..sss..',
    '.sssss.',
    '.sdsds.',
    '.sssss.',
    '.esses.',
    'sssssss',
    's.s.s.s',
    's.d.d.s',
    '.s.s.s.',
    's..s..s',
  ],
};

/** Abyssal: an anglerfish with its glowing lure. */
const ANGLER: SpriteDef = {
  palette: { p: '#c29bff', d: '#7d5bb8', a: '#ffd166', l: '#7d5bb8', w: '#ffffff', e: '#140a26' },
  rows: [
    'aa..........',
    'aa.l........',
    '....l.......',
    '....ppppp...',
    '..ppeppppp.p',
    '.wpppppppppp',
    'pw.wppppdpp.',
    '.pwpwppppp.p',
    '...ppppp....',
  ],
};

/** Trench Gem: a cut gold gem. */
const GEM: SpriteDef = {
  palette: { y: '#ffd166', o: '#d49a1f', w: '#fff6d6' },
  rows: [
    '..yyyyy..',
    '.ywyyyoy.',
    'yyyyyyyoo',
    '.yyyyyoo.',
    '..yyyoo..',
    '...yoo...',
    '....o....',
  ],
};

/** Lost Signal: a dead sonar screen. */
const STATIC: SpriteDef = {
  palette: { k: '#2a3446', g: '#6c7d92', d: '#141b26' },
  rows: [
    'kkkkkkkk',
    'kdgddgdk',
    'kddgdddk',
    'kgdddgdk',
    'kddgdddk',
    'kdgdddgk',
    'kkkkkkkk',
  ],
};

export const TIER_SPRITES: Record<Outcome, SpriteDef> = {
  shallows: BUBBLES,
  'red-herring': HERRING,
  shoal: FISH,
  twilight: SQUID,
  abyssal: ANGLER,
  gem: GEM,
  miss: STATIC,
};

// ── Dive buddies ─────────────────────────────────────────────────────────────

export interface Buddy {
  id: string;
  name: string;
  /** Best daily streak needed to unlock. */
  unlockStreak: number;
  blurb: string;
  sprite: SpriteDef;
}

const LANTERNFISH: SpriteDef = {
  palette: { b: '#3d6fa8', d: '#24466e', g: '#7ff5e6', e: '#081320' },
  rows: [
    '....bbbb....',
    '..bbbbbbbb.b',
    '.bebbbbbbbbb',
    'bbbbbbbbbbb.',
    '.bgbgbgbgb.b',
    '...dddd.....',
  ],
};

const HATCHETFISH: SpriteDef = {
  palette: { s: '#c9d6e3', d: '#8796a6', e: '#0b1626', g: '#7ff5e6' },
  rows: [
    '.sssss.....',
    'sesssss...s',
    'sssssssss.s',
    'sssssssssss',
    '.sssssss..s',
    '..gsgsgs...',
    '...ssss....',
    '....dd.....',
  ],
};

const VAMPIRE_SQUID: SpriteDef = {
  palette: { r: '#8c2f45', d: '#5a1a2b', e: '#7fd8ff', w: '#e9d0d6' },
  rows: [
    '....rrr....',
    '...rrrrr...',
    'r..rrrrr..r',
    '.r.rerer.r.',
    '..rrrrrrr..',
    '.rdrdrdrdr.',
    'rdddddddddr',
    'd.d.d.d.d.d',
    '.w.w.w.w.w.',
  ],
};

const DUMBO_OCTOPUS: SpriteDef = {
  palette: { p: '#ff9fbf', d: '#d96a92', e: '#2a0a16' },
  rows: [
    'pp..ppp..pp',
    'ppppppppppp',
    '.ppepppepp.',
    '..ppppppp..',
    '..ppppppp..',
    '.pdpdpdpdp.',
    '.p.p.p.p.p.',
    'p..p...p..p',
  ],
};

/** Bathy's evil twin: same hull, dark steel, red lamps. */
const ROGUE_BATHY: SpriteDef = {
  rows: BATHY.rows,
  palette: { ...BATHY.palette, S: '#4a5466', s: '#2c3442', h: '#8a94a6', g: '#5a0f1a', e: '#ff4d4d', a: '#ff3b3b' },
};

export const BUDDIES: readonly Buddy[] = [
  { id: 'lanternfish', name: 'Lanternfish', unlockStreak: 0, blurb: 'Glows along its belly. Always up for a dive.', sprite: LANTERNFISH },
  { id: 'hatchetfish', name: 'Hatchetfish', unlockStreak: 5, blurb: 'Thin as a coin and twice as shiny.', sprite: HATCHETFISH },
  { id: 'vampire-squid', name: 'Vampire Squid', unlockStreak: 14, blurb: 'Scary name. Eats marine snow. A sweetheart.', sprite: VAMPIRE_SQUID },
  { id: 'dumbo-octopus', name: 'Dumbo Octopus', unlockStreak: 30, blurb: 'Flaps its ear-fins. Lives deeper than almost any octopus.', sprite: DUMBO_OCTOPUS },
  { id: 'rogue-bathy', name: 'Rogue Bathy', unlockStreak: 45, blurb: "Bathy's evil twin. Red lamps. No comment.", sprite: ROGUE_BATHY },
];

export const buddyById = (id: string): Buddy => BUDDIES.find((b) => b.id === id) ?? BUDDIES[0];

// ── Scenery ──────────────────────────────────────────────────────────────────

/** Undersea volcano, shown around 3,000 m. 'l' pixels glow. */
export const VOLCANO: SpriteDef = {
  palette: { k: '#1a1416', r: '#3a2a2c', l: '#ff6a2b', y: '#ffd166', s: '#5a4a4c' },
  rows: [
    '.........y..........',
    '........yly.........',
    '.........l..........',
    '........sls.........',
    '.......kklkk........',
    '......kkrlrkk.......',
    '.....kkrrlrrkk......',
    '....kkrrrlrrrkk.....',
    '...kkrrrrrlrrrkk....',
    '..kkrrrrrrlrrrrkk...',
    '.kkrrrrrrrrlrrrrkk..',
    'kkrrrrrrrrrlrrrrrkk.',
  ],
};
