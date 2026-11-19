/** Menu panels shown in modals: How to Play (with a practice dive), Settings, Stats and Buddies. */
import { useMemo, useState, type FormEvent } from 'react';
import { BUDDIES, type Buddy } from '../art/creatures';
import type { SpriteDef } from '../art/sprites';
import { sound } from '../audio/sound';
import { PixelSprite } from '../components/PixelSprite';
import { TierIcon } from '../components/TierIcon';
import { PREVIEW_MS, PROMPTS_PER_DIVE, ROUND_MS, TIMEZONE } from '../config';
import { buildIndex } from '../logic/match';
import { submitAnswer, type PendingSuggestion } from '../logic/round';
import type { Stats } from '../logic/stats';
import type { StreakInfo } from '../logic/streak';
import { TIERS, TIER_ORDER, type Outcome } from '../logic/tiers';
import type { Answer } from '../logic/types';
import { dateKeyForDive } from '../logic/daily';
import { chapterKey, chapterStatus, isPlayable, type Pack } from '../logic/packs';
import type { FinishedDive, MotionSetting, Settings } from '../state/save';
import { PRACTICE_PROMPT } from '../data/practice';
import { PALETTES } from '../state/palettes';

// ── How to play ──────────────────────────────────────────────────────────────

export function HowToPlay() {
  return (
    <div className="howto">
      <ol className="howto-panels">
        <li className="howto-panel">
          <div className="howto-art">
            <span className="mini-card">Name a noodle dish</span>
            <span className="mini-ring">{PREVIEW_MS / 1000}</span>
          </div>
          <p>
            <b>Read.</b> Each prompt shows for {PREVIEW_MS / 1000}s before you can type, so check the small print.
          </p>
        </li>
        <li className="howto-panel">
          <div className="howto-art">
            <span className="mini-input">khao soi</span>
            <span className="mini-ring live">{ROUND_MS / 1000}</span>
          </div>
          <p>
            <b>Answer.</b> {ROUND_MS / 1000}s to name one thing. Misses just say "no echo", so keep guessing.
            Typos get a suggestion to confirm. Your first accepted answer locks in.
          </p>
        </li>
        <li className="howto-panel">
          <div className="howto-art ladder">
            {TIER_ORDER.map((t) => (
              <span key={t} className={`ladder-step tier-${t}`}>
                <TierIcon tier={t} scale={1} /> {TIERS[t].points}
              </span>
            ))}
          </div>
          <p>
            <b>Sink.</b> Rarer answers sink deeper. Every prompt hides one Trench Gem. Beware Red Herrings: the
            "clever" picks everyone thinks of.
          </p>
        </li>
      </ol>

      <Practice />

      <p className="muted small">
        {PROMPTS_PER_DIVE} prompts a day, the same for everyone, new at midnight ({TIMEZONE} time). No pausing: the
        timer keeps running if you switch tabs or reload.
      </p>
    </div>
  );
}

/** A throwaway prompt to try the controls on. No timer, nothing saved. */
function Practice() {
  const index = useMemo(() => buildIndex(PRACTICE_PROMPT), []);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<PendingSuggestion | null>(null);
  const [message, setMessage] = useState<{ kind: 'no-echo' | 'suggest' | 'hit'; answer?: Answer } | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    sound.unlock();
    const out = submitAnswer(input, index, pending);
    if (out.kind === 'empty') return;
    if (out.kind === 'no-echo') {
      sound.thud();
      setPending(null);
      setMessage({ kind: 'no-echo' });
    } else if (out.kind === 'suggest') {
      setPending({ input, answer: out.answer });
      setMessage({ kind: 'suggest', answer: out.answer });
    } else {
      sound.chime(out.answer.tier);
      setPending(null);
      setMessage({ kind: 'hit', answer: out.answer });
      setInput('');
    }
  }

  return (
    <section className="practice">
      <p className="eyebrow">practice dive</p>
      <p className="practice-prompt">{PRACTICE_PROMPT.prompt}</p>
      <form className="practice-row" onSubmit={submit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="try an answer…"
          aria-label="Practice answer"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button className="btn btn-dive" type="submit">
          Dive
        </button>
      </form>
      <div className="practice-result" aria-live="polite">
        {message?.kind === 'no-echo' && <p className="no-echo">no echo. try again</p>}
        {message?.kind === 'suggest' && message.answer && (
          <p>
            {pending?.input.trim()} → <b className="tier-gem">{message.answer.name}?</b>{' '}
            <span className="muted small">press Dive again to confirm</span>
          </p>
        )}
        {message?.kind === 'hit' && message.answer && (
          <p>
            <TierIcon tier={message.answer.tier} scale={2} />{' '}
            <b className={`tier-${message.answer.tier}`}>{TIERS[message.answer.tier].label}</b> · “
            {message.answer.name}” +{TIERS[message.answer.tier].points}
            <span className="muted small"> {message.answer.fact}</span>
          </p>
        )}
      </div>
    </section>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────

interface SettingsProps {
  settings: Settings;
  onChange: (next: Settings) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsProps) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  return (
    <div className="settings">
      <fieldset className="setting palette-setting">
        <legend>
          <b>Colours</b>
        </legend>
        <div className="palette-grid" role="radiogroup" aria-label="Colour scheme">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={settings.palette === p.id}
              className={`palette-option${settings.palette === p.id ? ' selected' : ''}`}
              onClick={() => set({ palette: p.id })}
            >
              <span className="palette-swatch" aria-hidden="true">
                {p.swatch.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </span>
              <span className="palette-name">{p.name}</span>
              <span className="muted small">{p.blurb}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <label className="setting">
        <span>
          <b>Sound</b>
          <span className="muted small">Off by default. Sound effects and music made with ElevenLabs.</span>
        </span>
        <input
          type="checkbox"
          checked={settings.sound}
          onChange={(e) => {
            sound.setEnabled(e.target.checked); // inside the tap, for iOS
            set({ sound: e.target.checked });
          }}
        />
      </label>
      <label className="setting">
        <span>
          <b>Volume</b>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          disabled={!settings.sound}
          onChange={(e) => set({ volume: Number(e.target.value) })}
          onPointerUp={() => sound.ping()}
          aria-label="Volume"
        />
      </label>
      <label className="setting">
        <span>
          <b>Music</b>
          <span className="muted small">An ambient loop that drifts darker as you sink.</span>
        </span>
        <input
          type="checkbox"
          checked={settings.ambient}
          disabled={!settings.sound}
          onChange={(e) => set({ ambient: e.target.checked })}
        />
      </label>
      <label className="setting">
        <span>
          <b>Colour-blind mode</b>
          <span className="muted small">Tier icons in the progress bar, patterned tier lines, safer colours.</span>
        </span>
        <input
          type="checkbox"
          checked={settings.colourblind}
          onChange={(e) => set({ colourblind: e.target.checked })}
        />
      </label>
      <label className="setting">
        <span>
          <b>Skip animations</b>
          <span className="muted small">Answers land instantly instead of sinking.</span>
        </span>
        <input
          type="checkbox"
          checked={settings.skipAnimations}
          onChange={(e) => set({ skipAnimations: e.target.checked })}
        />
      </label>
      <fieldset className="setting">
        <legend>
          <b>Motion</b>
        </legend>
        {(
          [
            ['system', 'Match my device'],
            ['reduced', 'Reduced motion'],
            ['full', 'Full motion'],
          ] as [MotionSetting, string][]
        ).map(([value, label]) => (
          <label key={value} className="radio">
            <input
              type="radio"
              name="motion"
              value={value}
              checked={settings.motion === value}
              onChange={() => set({ motion: value })}
            />
            {label}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function StatsPanel({
  stats,
  streak,
  endless,
}: {
  stats: Stats;
  streak: StreakInfo;
  endless: readonly FinishedDive[];
}) {
  const endlessBest = endless.length ? Math.max(...endless.map((d) => d.total)) : 0;
  const outcomes: Outcome[] = [...TIER_ORDER, 'miss'];
  const max = Math.max(1, ...outcomes.map((o) => stats.distribution[o]));
  return (
    <div className="stats">
      <div className="stats-grid">
        {[
          ['played', stats.played],
          ['average', stats.average],
          ['best', stats.best],
          ['streak', streak.current],
          ['best streak', streak.best],
        ].map(([label, value]) => (
          <div key={label}>
            <span className="stat-num">{value}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>
      <h3 className="section-title">where your answers landed</h3>
      <ul className="dist">
        {outcomes.map((o) => (
          <li key={o} className={`tier-${o}`}>
            <span className="dist-label">
              <TierIcon tier={o} scale={1} /> {TIERS[o].label}
            </span>
            <span className="dist-bar">
              <span style={{ width: `${(stats.distribution[o] / max) * 100}%` }} />
            </span>
            <span className="dist-count">{stats.distribution[o]}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">Daily dives only. Stats live in this browser.</p>
      <p className="endless-line">
        ∞ Endless dives: <b>{endless.length}</b> played · best <b>{endlessBest}</b>
      </p>
    </div>
  );
}

// ── Buddies ──────────────────────────────────────────────────────────────────

/** A sprite as a dark silhouette, for locked buddies. */
function silhouette(sprite: SpriteDef): SpriteDef {
  return { rows: sprite.rows, palette: Object.fromEntries(Object.keys(sprite.palette).map((k) => [k, '#1f2b3d'])) };
}

interface BuddiesProps {
  bestStreak: number;
  selected: string;
  onSelect: (id: string) => void;
}

export function BuddiesPanel({ bestStreak, selected, onSelect }: BuddiesProps) {
  return (
    <div className="buddies">
      <p className="muted small">
        Dive buddies swim beside Bathy. Unlock more with a longer daily streak (your best: {bestStreak}).
      </p>
      <ul className="buddy-grid">
        {BUDDIES.map((b: Buddy) => {
          const unlocked = bestStreak >= b.unlockStreak;
          return (
            <li key={b.id}>
              <button
                className={`buddy-card ${selected === b.id ? 'selected' : ''}`}
                disabled={!unlocked}
                aria-pressed={selected === b.id}
                onClick={() => onSelect(b.id)}
              >
                <PixelSprite sprite={unlocked ? b.sprite : silhouette(b.sprite)} scale={4} />
                <span className="buddy-name">{unlocked ? b.name : '???'}</span>
                <span className="muted small">
                  {unlocked ? b.blurb : `Reach a ${b.unlockStreak}-day streak`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Archive ──────────────────────────────────────────────────────────────────

interface ArchiveProps {
  /** Today's dive number: the archive lists every dive before it. */
  today: number;
  daily: Record<number, FinishedDive>;
  archive: Record<number, FinishedDive>;
  onPlay: (diveNumber: number) => void;
}

const fmtDate = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

export function ArchivePanel({ today, daily, archive, onPlay }: ArchiveProps) {
  const past = Array.from({ length: Math.max(0, today - 1) }, (_, i) => today - 1 - i);
  if (past.length === 0) {
    return <p className="muted">No past dives yet. Today is Dive #{today}: come back tomorrow.</p>;
  }
  return (
    <div className="archive">
      <p className="muted small">
        Replay any past daily dive. Replays don't count towards your streak or stats. If you played that day, you get
        the exact prompts you had.
      </p>
      <ul className="archive-list">
        {past.map((n) => {
          const played = daily[n];
          const replayed = archive[n];
          return (
            <li key={n}>
              <button className="archive-row" onClick={() => onPlay(n)}>
                <span className="archive-num">#{n}</span>
                <span className="archive-date">{fmtDate(dateKeyForDive(n))}</span>
                <span className="archive-status">
                  {played && <span>played {played.total}</span>}
                  {replayed && <span>replay {replayed.total}</span>}
                  {!played && !replayed && <span className="muted">not played</span>}
                </span>
                <span aria-hidden className="archive-go">▶</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Themed packs ─────────────────────────────────────────────────────────────

interface PacksProps {
  packs: readonly Pack[];
  /** Best result per chapter, keyed "packId:chapter". */
  results: Record<string, FinishedDive>;
  onPlay: (packId: string, chapter: number) => void;
}

/** Two levels in one modal: the pack list, then a pack's chapters. */
/** A little emoji badge per pack; anything not listed gets a plain tile. */
const PACK_ICONS: Record<string, string> = {
  words: '🔤',
  movies: '🎬',
  sports: '🏈',
  geography: '🧭',
  music: '🎵',
  history: '🏛️',
  science: '🔬',
  screen: '🎮',
  food: '🍜',
  australia: '🦘',
};

export function PacksPanel({ packs, results, onPlay }: PacksProps) {
  const [openPack, setOpenPack] = useState<string | null>(null);
  const finished = useMemo(() => new Set(Object.keys(results)), [results]);
  const pack = packs.find((p) => p.id === openPack);

  if (!pack) {
    return (
      <div className="packs">
        <p className="muted small">
          Themed dives, chapter by chapter. Finish a chapter to unlock the next. Packs don't count towards your streak
          or stats.
        </p>
        <ul className="pack-list">
          {packs.map((p) => {
            const playable = p.chapters.filter(isPlayable).length;
            const done = p.chapters.filter((_, i) => finished.has(chapterKey(p.id, i + 1))).length;
            return (
              <li key={p.id}>
                <button className={`pack-card theme-${p.theme}`} onClick={() => setOpenPack(p.id)}>
                  <span className="pack-icon" aria-hidden="true">
                    {PACK_ICONS[p.id] ?? '▦'}
                  </span>
                  <span className="pack-text">
                    <span className="pack-title">{p.title}</span>
                    <span className="pack-blurb">{p.blurb}</span>
                  </span>
                  <span className="pack-progress" aria-label={`${done} of ${playable} chapters done`}>
                    {done}/{playable}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="packs">
      <button className="link-btn pack-back" onClick={() => setOpenPack(null)}>
        ← All packs
      </button>
      <h3 className="pack-heading">
        <span aria-hidden="true">{PACK_ICONS[pack.id] ?? '▦'} </span>
        {pack.title}
      </h3>
      <p className="muted small">{pack.blurb}</p>
      <ol className="chapter-list">
        {pack.chapters.map((ch, i) => {
          const n = i + 1;
          const status = chapterStatus(pack, n, finished);
          const best = results[chapterKey(pack.id, n)];
          const canPlay = status === 'open' || status === 'done';
          return (
            <li key={n}>
              <button className={`chapter-row status-${status}`} disabled={!canPlay} onClick={() => onPlay(pack.id, n)}>
                <span className="chapter-num">{n}</span>
                <span className="chapter-title">{ch.title}</span>
                <span className="chapter-status">
                  {status === 'done' && best && <>best {best.total}</>}
                  {status === 'open' && <>dive ▶</>}
                  {status === 'locked' && <>🔒 finish {n - 1}</>}
                  {status === 'coming-soon' && <>coming soon</>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
