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
import type { MotionSetting, Settings } from '../state/save';
import { PRACTICE_PROMPT } from '../data/practice';

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
      <label className="setting">
        <span>
          <b>Sound</b>
          <span className="muted small">Off by default. All sounds are synthesised live.</span>
        </span>
        <input type="checkbox" checked={settings.sound} onChange={(e) => set({ sound: e.target.checked })} />
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
          <b>Ambient hum</b>
          <span className="muted small">A low drone that gets darker as you sink.</span>
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

export function StatsPanel({ stats, streak }: { stats: Stats; streak: StreakInfo }) {
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
