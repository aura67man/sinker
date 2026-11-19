/**
 * The dive itself: one prompt at a time (RoundView), then the sink and
 * reveal for the answer that landed (RevealView), seven times over.
 *
 * All the real state lives in the save (ActiveDive), so a reload drops you
 * back exactly where you were, clock still running.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { sound } from '../audio/sound';
import type { SpriteDef } from '../art/sprites';
import { BathyCrew } from '../components/Bathy';
import { TierIcon } from '../components/TierIcon';
import { DepthScale } from '../components/DepthScale';
import { TimerRing } from '../components/TimerRing';
import { PROMPTS_PER_DIVE } from '../config';
import { buildIndex } from '../logic/match';
import { answerTimeLeft, previewLeft, roundPhase, submitAnswer, type PendingSuggestion } from '../logic/round';
import { totalScore, type RoundResult } from '../logic/scoring';
import { distanceFor, OCEAN, type Theme } from '../logic/theme';
import { TIERS, TIER_ORDER } from '../logic/tiers';
import type { Prompt } from '../logic/types';
import type { ActiveDive } from '../state/save';
import { useNow } from '../state/hooks';
import './dive.css';

const fmt = (n: number) => n.toLocaleString('en-AU');

interface Props {
  active: ActiveDive;
  prompts: Prompt[];
  /** Play the sink animation (false when skipped or reduced motion). */
  animate: boolean;
  onRoundResult: (result: RoundResult) => void;
  onNextRound: () => void;
  onFinish: () => void;
  /** Reports the running score, so the background can follow along. */
  onScoreChange: (points: number) => void;
  /** Ocean (metres of depth) or pitch (yards gained). */
  theme?: Theme;
  /** "∞ #3", "#1 ⟲", "Words 2"... shown on the prompt card for non-daily dives. */
  modeLabel: string;
  /** Sprite of the chosen dive buddy. */
  buddy: SpriteDef | null;
  /** Colour-blind mode: icons in the progress pips. */
  colourblind: boolean;
}

export function Dive({
  active,
  prompts,
  animate,
  onRoundResult,
  onNextRound,
  onFinish,
  onScoreChange,
  theme = OCEAN,
  modeLabel,
  buddy,
  colourblind,
}: Props) {
  const inRound = active.roundStartedAt !== null && active.rounds.length < PROMPTS_PER_DIVE;
  const total = totalScore(active.rounds);
  const depth = distanceFor(total, theme);
  const lastIndex = active.rounds.length - 1;

  // Tell the ocean behind us how deep we are.
  useEffect(() => onScoreChange(total), [total, onScoreChange]);

  return (
    <div className="dive">
      <Hud
        rounds={active.rounds}
        current={inRound ? active.rounds.length : lastIndex}
        depth={depth}
        theme={theme}
        score={total}
        animate={animate}
        colourblind={colourblind}
      />
      <DepthScale distance={depth} animate={animate} theme={theme} />

      {inRound ? (
        <RoundView
          key={active.rounds.length}
          prompt={prompts[active.rounds.length]}
          roundNumber={active.rounds.length + 1}
          modeTag={active.mode === 'daily' ? '' : modeLabel}
          theme={theme}
          startedAt={active.roundStartedAt!}
          onResult={onRoundResult}
          buddy={buddy}
        />
      ) : lastIndex >= 0 ? (
        <RevealView
          key={lastIndex}
          prompt={prompts[lastIndex]}
          result={active.rounds[lastIndex]}
          depthBefore={distanceFor(totalScore(active.rounds.slice(0, -1)), theme)}
          theme={theme}
          isLast={active.rounds.length >= PROMPTS_PER_DIVE}
          animate={animate}
          onNext={active.rounds.length >= PROMPTS_PER_DIVE ? onFinish : onNextRound}
          buddy={buddy}
        />
      ) : null}
    </div>
  );
}

// ── HUD ──────────────────────────────────────────────────────────────────────

function Hud({
  rounds,
  current,
  depth,
  theme,
  score,
  animate,
  colourblind,
}: {
  rounds: RoundResult[];
  current: number;
  depth: number;
  theme: Theme;
  score: number;
  animate: boolean;
  colourblind: boolean;
}) {
  const shownScore = useCountUp(score, animate);
  const shownDepth = useCountUp(depth, animate);
  return (
    <header className="hud">
      <div className="hud-box">
        <span className="hud-label">{theme.distanceLabel}</span>
        <span className="hud-value depth">
          {fmt(shownDepth)}
          {theme.unit}
        </span>
      </div>
      <div className={`pips ${colourblind ? 'cb' : ''}`} aria-label={`Prompt ${Math.min(current + 1, PROMPTS_PER_DIVE)} of ${PROMPTS_PER_DIVE}`}>
        <div className="pip-row">
          {Array.from({ length: PROMPTS_PER_DIVE }, (_, i) => {
            const r = rounds[i];
            return (
              <span key={i} className={`pip ${r ? `tier-${r.outcome} done` : ''} ${i === current ? 'current' : ''}`}>
                {colourblind && r && <TierIcon tier={r.outcome} scale={1} />}
              </span>
            );
          })}
        </div>
        <span className="hud-label">
          prompt {Math.min(current + 1, PROMPTS_PER_DIVE)} of {PROMPTS_PER_DIVE}
        </span>
      </div>
      <div className="hud-box right">
        <span className="hud-label">score</span>
        <span className="hud-value score">{shownScore}</span>
      </div>
    </header>
  );
}

/** Eases a number towards its target over ~1.3 s (instant when not animating). */
function useCountUp(target: number, animate: boolean): number {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    if (!animate) {
      setShown(target);
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 1300);
      const eased = 1 - Math.pow(1 - k, 3);
      const value = Math.round(from + (target - from) * eased);
      setShown(value);
      fromRef.current = value;
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate]);
  return shown;
}

// ── One prompt ───────────────────────────────────────────────────────────────

interface RoundProps {
  prompt: Prompt;
  roundNumber: number;
  startedAt: number;
  onResult: (result: RoundResult) => void;
  buddy: SpriteDef | null;
  /** "∞ #3" or "#1 ⟲" for non-daily dives, so you know which mode you're in. */
  modeTag: string;
  theme: Theme;
}

type Feedback = { kind: 'no-echo' | 'suggest'; id: number } | null;

const SHAKE: Keyframe[] = [0, -8, 7, -5, 3, 0].map((x) => ({ transform: `translateX(${x}px)` }));

function RoundView({ prompt, roundNumber, startedAt, onResult, buddy, modeTag, theme }: RoundProps) {
  const now = useNow();
  const phase = roundPhase(startedAt, now);
  const index = useMemo(() => buildIndex(prompt), [prompt]);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const done = useRef(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<PendingSuggestion | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const finish = (result: RoundResult) => {
    if (done.current) return;
    done.current = true;
    onResult(result);
  };

  // Out of time → a miss. Also covers reloading the page after time ran out.
  useEffect(() => {
    if (phase === 'over') finish({ promptId: prompt.id, outcome: 'miss' });
  });

  // Sonar ping as the prompt appears (only if we're actually at the start).
  useEffect(() => {
    if (roundPhase(startedAt, Date.now()) === 'preview') sound.ping();
  }, [startedAt]);

  // Heartbeat for each of the last five seconds.
  const secondsLeft = Math.ceil(answerTimeLeft(startedAt, now) / 1000);
  useEffect(() => {
    if (phase === 'active' && secondsLeft <= 5 && secondsLeft > 0) sound.tick();
  }, [secondsLeft, phase]);

  // Unlock and focus the input the moment the preview ends.
  useEffect(() => {
    if (phase === 'active') inputRef.current?.focus();
  }, [phase]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (phase !== 'active') return;
    const outcome = submitAnswer(input, index, pending);
    switch (outcome.kind) {
      case 'empty':
        return;
      case 'no-echo':
        setPending(null);
        sound.thud();
        setFeedback({ kind: 'no-echo', id: Date.now() });
        formRef.current?.animate(SHAKE, { duration: 360, easing: 'ease-out' });
        inputRef.current?.select();
        return;
      case 'suggest':
        setPending({ input, answer: outcome.answer });
        setFeedback({ kind: 'suggest', id: Date.now() });
        return;
      case 'accept':
        finish({ promptId: prompt.id, outcome: outcome.answer.tier, answer: outcome.answer.name });
    }
  }

  const acceptSuggestion = () => {
    if (pending && phase === 'active') {
      finish({ promptId: prompt.id, outcome: pending.answer.tier, answer: pending.answer.name });
    }
  };

  const pLeft = previewLeft(startedAt, now);

  return (
    <section className="round" aria-live="polite">
      <div className="prompt-card">
        <p className="eyebrow">
          prompt {roundNumber} of {PROMPTS_PER_DIVE}
          {modeTag && <span className="mode-tag">{modeTag}</span>}
        </p>
        <h1 className="prompt-text">{prompt.prompt}</h1>
        {prompt.qualifiers?.length ? (
          <ul className="qualifiers">
            {prompt.qualifiers.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        ) : null}
        <p className="hint">
          {theme.id === 'pitch' ? '► rarer answers gain more ground ►' : '▼ rarer answers sink deeper ▼'}
        </p>
      </div>

      <form ref={formRef} className="answer-row" onSubmit={submit}>
        <TimerRing timeLeft={answerTimeLeft(startedAt, now)} previewLeft={pLeft} />
        <input
          ref={inputRef}
          className="answer-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={phase !== 'active'}
          placeholder={phase === 'preview' ? 'read the prompt…' : 'type one answer…'}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-label="Your answer"
        />
        <button className="btn btn-dive" type="submit" disabled={phase !== 'active'}>
          Dive
        </button>
      </form>

      <div className="feedback">
        {feedback?.kind === 'no-echo' && <p className="no-echo">no echo. try again</p>}
        {feedback?.kind === 'suggest' && pending && (
          <p className="suggest">
            {pending.input.trim()} →{' '}
            <button type="button" className="link-btn" onClick={acceptSuggestion}>
              {pending.answer.name}?
            </button>{' '}
            <span className="muted">tap it, or press Dive again to confirm</span>
          </p>
        )}
      </div>

      <BathyCrew buddy={buddy} className="round-bathy" />
    </section>
  );
}

// ── Sink + reveal ────────────────────────────────────────────────────────────

/** Tier lines in the sink column, shallowest first, as a fraction of a Trench Gem's drop. */
const LINE_FRACTIONS = TIER_ORDER.map((t) => ({ tier: t, fraction: TIERS[t].points / TIERS.gem.points }));
/** Sink column height: shorter on small phones so the whole reveal fits on screen. */
const columnPx = () => Math.round(Math.min(280, Math.max(170, window.innerHeight * 0.3)));

interface RevealProps {
  prompt: Prompt;
  result: RoundResult;
  depthBefore: number;
  theme: Theme;
  isLast: boolean;
  animate: boolean;
  onNext: () => void;
  buddy: SpriteDef | null;
}

function RevealView({ prompt, result, depthBefore, isLast, animate, onNext, buddy, theme }: RevealProps) {
  const tier = TIERS[result.outcome];
  const isMiss = result.outcome === 'miss';
  const metres = distanceFor(tier.points, theme);
  const depthAfter = depthBefore + metres;
  const fraction = tier.points / TIERS.gem.points;
  const answer = prompt.answers.find((a) => a.name === result.answer);
  // Show only the deepest landmark passed this round, to keep the reveal compact.
  const passed = theme.landmarks.filter((l) => l.depth > depthBefore && l.depth <= depthAfter).slice(-1);
  const chipRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [settled, setSettled] = useState(!animate);
  const [column] = useState(columnPx);
  const yFor = (frac: number) => frac * column;

  useEffect(() => {
    const chip = chipRef.current;
    if (!animate || !chip) {
      setSettled(true);
      return;
    }
    if (!isMiss) sound.splashAndSink(1.3);
    const target = isMiss ? 0 : fraction * column;
    // Accelerate like something heavy, then a small bounce as it settles.
    const anim = chip.animate(
      isMiss
        ? [{ opacity: 1 }, { opacity: 0.35 }]
        : [
            { transform: 'translateY(0)', offset: 0, easing: 'cubic-bezier(.5,0,.9,.6)' },
            { transform: `translateY(${target + 10}px)`, offset: 0.82, easing: 'ease-out' },
            { transform: `translateY(${target}px)`, offset: 1 },
          ],
      { duration: isMiss ? 600 : 1400, fill: 'forwards' },
    );
    anim.finished.then(() => setSettled(true)).catch(() => undefined);
    return () => anim.cancel();
  }, [animate, isMiss, fraction, column]);

  useEffect(() => {
    if (settled) sound.chime(result.outcome);
  }, [settled, result.outcome]);

  useEffect(() => {
    // preventScroll: keep the sink column in view on short screens.
    if (settled) nextRef.current?.focus({ preventScroll: true });
  }, [settled]);

  return (
    <section className="reveal">
      <p className="reveal-prompt">{prompt.prompt}</p>

      <div className="sink-column" style={{ height: column + 24 }} aria-hidden>
        {LINE_FRACTIONS.map(({ tier: t, fraction: f }) => (
          <div
            key={t}
            className={`tier-line tier-${t} ${t === result.outcome && settled ? 'hit' : ''}`}
            style={{ top: yFor(f) + 12 }}
          >
            <span>
              <TierIcon tier={t} scale={1} /> {TIERS[t].label} · {TIERS[t].points}
            </span>
          </div>
        ))}
        <div
          ref={chipRef}
          className={`chip tier-${result.outcome}`}
          style={settled ? { transform: `translateY(${isMiss ? 0 : yFor(fraction)}px)` } : undefined}
        >
          <BathyCrew buddy={buddy} scale={2} />
          <span className="chip-tag">{isMiss ? '— — —' : `“${result.answer}”`}</span>
        </div>
      </div>

      <div className={`reveal-text ${settled ? 'show' : ''}`}>
        <div className="tier-badge">
          <TierIcon tier={result.outcome} scale={4} labelled />
        </div>
        <h2 className={`tier-title tier-${result.outcome}`}>{tier.label}</h2>
        {!isMiss && <p className="reveal-answer">“{result.answer}”</p>}
        <p className="reveal-points">
          <span className={`tier-${result.outcome}`}>+{tier.points} pts</span>
          {!isMiss && (
            <>
              {' '}
              · {theme.verb} {fmt(metres)} {theme.unit}
            </>
          )}
        </p>
        <p className="reveal-flavour">{tier.flavour}</p>
        {answer && <p className="reveal-fact">{answer.fact}</p>}
        {passed.map((l) => (
          <p key={l.depth} className="reveal-landmark">
            passing {fmt(l.depth)} {theme.unit}: {l.label}
          </p>
        ))}
        <button ref={nextRef} className="btn btn-primary" onClick={onNext} disabled={!settled}>
          {isLast ? 'Surface for results ▲' : 'Descend ▼'}
        </button>
      </div>
    </section>
  );
}
