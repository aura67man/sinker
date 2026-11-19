# SINKER

A daily word-trivia dive. Seven prompts a day, the same seven for everyone.
Name something that fits; the rarer your answer, the more points you score
and the deeper Bathy, a tiny pixel bathysphere, sinks.

Personal project, all original name, art and copy. Built with Vite + React +
TypeScript, fully client-side.

> **Status: Phase 5 + content sprint.** Daily Dive, ∞ Unlimited, ⟲ Archive
> and ▦ Themed Packs are all playable, with pixel art, synthesised sound,
> stats, dive buddies, colour palettes, colour-blind mode and a How to Play
> with a practice dive. Content: 66 daily prompts plus 10 packs × 1 chapter
> (136 prompts, ~11,300 answers). The test bench and sprite gallery live at
> `?lab`.

## Features

- **Daily Dive**: 7 prompts a day, the same for everyone, new at midnight Sydney time.
  The only mode that counts towards streaks, stats and buddies.
- **∞ Unlimited (the Endless Dive)**: numbered random dives, as many as you
  like. Each number is a fixed seeded deal (shared as `SINKER ∞ #n`), and
  today's daily prompts are always left out so nothing gets spoiled.
- **⟲ Archive**: replay any past daily dive. If you played it that day, you
  get the exact same prompts.
- **▦ Themed packs**: Words & Language, At the Movies, Sports, Geography,
  Music, History & Myth, Science & Nature, Screen & Games, Food & Drink and
  Straya. Each pack is a list of seven-prompt chapters that unlock in order.
  The Sports pack plays on a football field: 1 point = 1 yard instead of 10 m.
- One dive at a time: Unlimited, Archive and pack dives can be abandoned from
  the menu; the daily dive can't.
- **Sound**: everything is synthesised live with the Web Audio API (no audio
  files). Off by default; toggle with the speaker button or in Settings.
- **Stats**: games played, average, best, streaks and where your answers landed.
- **Dive buddies**: unlock companions with a longer best streak
  (5, 14, 30 and 45 days).
- **Colour palettes**: Abyss (the original), Coral Reef, Kelp Forest and
  Bioluminescence, in Settings. Tier colours stay the same in every palette.
- **Accessibility**: colour-blind mode (icons + patterned lines + safer
  palette), reduced motion (follows your device, or force it), skip
  animations, keyboard-friendly, big tap targets.

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

## Saving and fairness

Progress is saved to `localStorage` as you play: each round's result, plus the
moment the current round started. Reloading mid-round drops you back in with
the clock still running (it never pauses or resets), and a finished day opens
straight to its results. Clearing site data wipes your history and streak.

## Adding pack chapters (or whole packs)

Each pack lives in `src/data/packs/<pack-id>/`:

- `pack.json`: title, short name, blurb, theme (`"ocean"` or `"pitch"`) and
  the chapter list. A chapter is `{ "title": "...", "promptIds": [7 ids] }`.
  A chapter with `"promptIds": []` shows as "coming soon".
- One JSON file per prompt, same format as the daily prompts. Pack prompts are
  never dealt into daily, Unlimited or Archive dives.

To add Chapter 2, drop seven prompt files into the pack's folder and list
their ids in that chapter. `npm run validate` checks every manifest: seven
prompts per playable chapter, every id has a file, no prompt used twice, and
prompt ids unique across the whole project. A new pack folder also needs its
id added to `PACK_ORDER` in `src/data/index.ts`.

## Colour palettes

Palettes live in `src/state/palettes.ts` (name, blurb, swatch) and
`src/styles/polish.css` (one `html[data-palette='…']` block each). A palette
only swaps tokens: `--bg`, `--panel`, `--line`, `--teal` (the accent),
`--amber` (the highlight), `--amber-dark` (text on the Dive button) and
`--ocean-tint`. Add an id to `PaletteId`, an entry to `PALETTES` and a CSS
block, and it shows up in Settings.

## Editing pixel art

Sprites live in `src/art/` as grids of characters, one per pixel, with a
palette mapping each character to a colour (`.` is transparent). Change a
row, save, and check the result in the sprite gallery at `?lab`.

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

- **`id`**: must match the file name. Names are compared after normalising,
  so `C`, `C++` and `C#` stay different (`+` → "plus", `#` → "sharp").
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
  `N` prompts you get `floor(N / 7)` fresh days per cycle: 66 prompts gives
  9 fresh days. More content = longer before repeats. Unlimited deals from
  the same pool, so every new daily prompt also feeds the Endless Dive.
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
  data/           prompt JSON files (prompts/ = daily pool, packs/<id>/ =
                  themed packs) + lazy loader
  art/            pixel sprites (editable character grids), creatures, water colours
  audio/          Web Audio sound engine (all procedural)
  components/     Bathy, timer ring, depth ruler, ocean, modal, toast
  screens/        Title, Dive (round + reveal), Results, How to Play/Settings
  state/          save file (localStorage), palettes and small hooks
  styles/         global.css (tokens, shared bits) + polish.css (palettes,
                  final layer, loaded last)
  lab/            Phase 1 test page (open with ?lab)
scripts/
  validate-data.ts
```

## Roadmap

1. ✅ Foundations: logic, tests, validator, first 10 prompts
2. ✅ Playable Daily Dive: full loop, sink animation, results, share, streaks
3. ✅ Art, sound & polish: pixel art, Bathy, depth landmarks, audio, settings,
   accessibility, How to Play, stats, buddies, 30 prompts
4. ✅ Unlimited & Archive
5. ✅ Themed packs (Chapter 1 of each; more chapters in content batches),
   then a content sprint (66 daily prompts, 10 packs) and a polish pass
6. Depth Charge multiplayer (needs a backend; proposal first)
