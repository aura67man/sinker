# SINKER

A daily word-trivia dive. Seven prompts a day, the same seven for everyone.
Name something that fits; the rarer your answer, the more points you score
and the deeper Bathy, a tiny pixel bathysphere, sinks.

Personal project, all original name, art and copy. Built with Vite + React +
TypeScript, fully client-side.

> **Status: Phase 1 (foundations).** The game logic, tests, validator and the
> first 10 prompts are done. Right now the app is a plain "lab" page for
> checking the daily deal and the answer matching. The actual game UI lands
> in Phase 2.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests + a validation pass over every prompt file
npm run validate   # content report: tier counts, errors, fuzzy collisions
npm run build      # production build into dist/
```

## How scoring works

| Tier | Points | Depth | Share |
|---|---|---|---|
| Shallows | 10 | 100 m | 🫧 |
| Red Herring | 15 | 150 m | 🎣 |
| Shoal | 30 | 300 m | 🐟 |
| Twilight | 60 | 600 m | 🦑 |
| Abyssal | 85 | 850 m | 🏮 |
| Trench Gem | 100 | 1,000 m | 🌟 |
| Lost Signal (timeout) | 0 | – | ⬛ |

Score is the plain sum of seven tier values. 1 point = 10 m, so a perfect 700
reaches the trench floor at 7,000 m. Rarity is preset in the data, not worked
out from what other players type.

## Adding prompts

Each daily prompt is one JSON file in `src/data/prompts/`. The file name must
match its `id`. Drop a new file in and it joins the daily pool automatically.

```json
{
  "id": "noodle-dishes",
  "prompt": "Name a noodle dish",
  "category": "food",
  "qualifiers": ["no Italian pasta"],
  "answers": [
    { "name": "Ramen", "tier": "shallows", "fact": "Japan has a whole museum for it." },
    { "name": "Khao soi", "aliases": ["khao soy"], "tier": "twilight", "fact": "Northern Thai curry noodle soup." },
    { "name": "Biang biang noodles", "tier": "gem", "fact": "Its character takes ~58 strokes to write." }
  ]
}
```

- **`category`**: one of `food`, `animals`, `geography`, `words`, `sport`,
  `screen`, `science`, `music`.
- **`qualifiers`**: small print shown under the prompt during the 3-second preview.
- **`aliases`**: other spellings or names that count as the same answer.
- **`tier`**: `shallows`, `red-herring`, `shoal`, `twilight`, `abyssal` or `gem`.
- **`fact`**: one line, shown after the answer lands. Required.

Tiering guide:

- **Shallows**: the first thing everyone blurts out.
- **Red Herring**: the pick that *feels* clever but everyone reaches for.
- **Shoal**: solid and known, just not the first thought.
- **Twilight**: genuinely uncommon.
- **Abyssal**: true obscurity. Keep it to a handful (≤ 6).
- **Gem**: exactly one per prompt, hand-picked. Not necessarily the rarest: the
  most satisfying answer to land, one that a few players will actually get.

**The answer list is the whole game.** Anything not listed gets "no echo", even
if it's technically right, so aim for 40–150 answers and cover the obvious ones.

### Validator

`npm run validate` checks every prompt file and prints a tier-count table.

- **Errors** (fail the run and CI): bad JSON, unknown tier or category, id not
  matching the file name, not exactly one gem, a missing fact, or two answers
  sharing a name/alias after normalising.
- **Warnings** (for you to eyeball): thin lists, too many Abyssal answers, and
  **fuzzy collisions**, where two different answers are within typo distance
  of each other (e.g. "Taco" / "Taro"). The matcher refuses to guess when a
  typo is equally close to both, so these are safe, but worth a look in case
  an alias is causing it.

## How matching works

1. Normalise: lowercase, strip accents and punctuation, collapse spaces, ignore
   spaces inside names ("spider man" = "spiderman"), and also try without a
   leading "the".
2. Exact match against every name and alias → accepted.
3. Otherwise Damerau-Levenshtein fuzzy match, with the allowed typos scaled to
   word length (none under 4 letters, 1 up to 5, 2 up to 11, 3 beyond). A fuzzy
   hit only ever **suggests** ("esspreso → Espresso?"). The player has to confirm.

All of this lives in `src/logic/` as pure TypeScript with no React, so it's
easy to test.

## The daily deal

- The day rolls over at local midnight in `TIMEZONE` (`src/config.ts`,
  currently `Australia/Sydney`). `LAUNCH_DATE` is Dive #1.
- The prompt pool is shuffled with a seeded RNG and dealt seven a day, like a
  deck. No prompt repeats until the deck runs out, then it reshuffles. With
  `N` prompts you get `floor(N / 7)` fresh days per cycle, so 10 prompts is
  only 1 day. More content = longer before repeats.
- Adding prompts reshuffles every dive, past ones included. Finished dives will
  store their own prompt ids, so your history is unaffected.

## Deploying to GitHub Pages

The workflow in `.github/workflows/deploy.yml` runs tests, the validator and a
build on every push. Pushes to `main` also deploy.

One-time setup: in the repo on GitHub go to **Settings → Pages → Build and
deployment → Source** and pick **GitHub Actions**. The site then lives at
`https://<your-username>.github.io/sinker/`.

## Project layout

```
src/
  config.ts       timezone, launch date, timings, deck seed
  logic/          pure game logic + tests (scoring, matching, daily deal,
                  streaks, share text, percentile estimate, validation)
  data/           prompt JSON files + lazy loader
  lab/            Phase 1 test page
scripts/
  validate-data.ts
```

## Roadmap

1. ✅ Foundations: logic, tests, validator, first 10 prompts
2. Playable Daily Dive: full loop, sink animation, results, share, streaks
3. Art, sound & polish: pixel art, Bathy, depth landmarks, audio, settings,
   accessibility, How to Play, stats, buddies, 30+ prompts
4. Unlimited & Archive
5. Themed packs
6. Depth Charge multiplayer (needs a backend; proposal first)
