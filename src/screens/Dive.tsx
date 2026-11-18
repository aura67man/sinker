/**
 * The dive itself: one prompt at a time (RoundView), then the sink and
 * reveal for the answer that landed (RevealView), seven times over.
 *
 * All the real state lives in the save (ActiveDive), so a reload drops you
 * back exactly where you were, clock still running.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Bathy } from '../components/Bathy';
import { DepthScale } from '../components/DepthScale';
import { TimerRing } from '../components/TimerRing';
import { PROMPTS_PER_DIVE } from '../config';
import { LANDMARKS } from '../logic/landmarks';
import { buildIndex } from '../logic/match';
import { answerTimeLeft, previewLeft, roundPhase, submitAnswer, type PendingSuggestion } from '../logic/round';
import { depthForPoints, totalScore, type RoundResult } from '../logic/scoring';
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
  onDepthChange: (depth: number) => void;
}

export function Dive({ active, prompts, animate, onRoundResult, onNextRound, onFinish, onDepthChange }: Props) {
  const inRound = active.roundStartedAt !== null && active.rounds.length < PROMPTS_PER_DIVE;
  const total = totalScore(active.rounds);
  const depth = depthForPoints(total);
  const lastIndex = active.rounds.length - 1;

  // Tell the ocean behind us how deep we are.
  useEffect(() => onDepthChange(depth), [depth, onDepthChange]);

  return (
    <div className="dive">
      <Hud
        rounds={active.rounds}
        current={inRound ? active.rounds.length : lastIndex}
        depth={depth}
        score={total}
        animate={animate}
      />
      <DepthScale depth={depth} animate={animate} />

      {inRound ? (
        <RoundView
          key={active.rounds.length}
          prompt={prompts[active.rounds.length]}
          roundNumber={active.rounds.length + 1}
          startedAt={active.roundStartedAt!}
          onResult={onRoundResult}
        />
      ) : lastIndex >= 0 ? (
        <RevealView
          key={lastIndex}
          prompt={prompts[lastIndex]}
          result={active.rounds[lastIndex]}
          depthBefore={depthForPoints(totalScore(active.rounds.slice(0, -1)))}
          isLast={active.rounds.length >= PROMPTS_PER_DIVE}
          animate={animate}
          onNext={active.rounds.length >= PROMPTS_PER_DIVE ? onFinish : onNextRound}
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
  score,
  animate,
}: {
  rounds: RoundResult[];
  current: number;
  depth: number;
  score: number;
  animate: boolean;
}) {
  const shownScore = useCountUp(score, animate);
  const shownDepth = useCountUp(depth, animate);
  return (
    <header className="hud">
      <div className="hud-box">
        <span className="hud-label">depth</span>
        <span className="hud-value depth">{fmt(shownDepth)}m</span>
      </div>
      <div className="pips" aria-label={`Prompt ${Math.min(current + 1, PROMPTS_PER_DIVE)} of ${PROMPTS_PER_DIVE}`}>
        <div className="pip-row">
          {Array.from({ length: PROMPTS_PER_DIVE }, (_, i) => {
            const r = rounds[i];
            return <span key={i} className={`pip ${r ? `tier-${r.outcome} done` : ''} ${i === current ? 'current' : ''}`} />;
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
}

type Feedback = { kind: 'no-echo' | 'suggest'; id: number } | null;

const SHAKE: Keyframe[] = [0, -8, 7, -5, 3, 0].map((x) => ({ transform: `translateX(${x}px)` }));

function RoundView({ prompt, roundNumber, startedAt, onResult }: RoundProps) {
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
        </p>
        <h1 className="prompt-text">{prompt.prompt}</h1>
        {prompt.qualifiers?.length ? (
          <ul className="qualifiers">
            {prompt.qualifiers.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        ) : null}
        <p className="hint">▼ rarer answers sink deeper ▼</p>
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

      <Bathy className="round-bathy" />
    </section>
  );
}

// ── Sink + reveal ────────────────────────────────────────────────────────────

/** Depths of the tier lines in the sink column, shallowest first. */
const LINE_DEPTHS = TIER_ORDER.map((t) => ({ tier: t, depth: depthForPoints(TIERS[t].points) }));
/** Sink column height: shorter on small phones so the whole reveal fits on screen. */
const columnPx = () => Math.round(Math.min(280, Math.max(170, window.innerHeight * 0.3)));

interface RevealProps {
  prompt: Prompt;
  result: RoundResult;
  depthBefore: number;
  isLast: boolean;
  animate: boolean;
  onNext: () => void;
}

function RevealView({ prompt, result, depthBefore, isLast, animate, onNext }: RevealProps) {
  const tier = TIERS[result.outcome];
  const isMiss = result.outcome === 'miss';
  const metres = depthForPoints(tier.points);
  const depthAfter = depthBefore + metres;
  const answer = prompt.answers.find((a) => a.name === result.answer);
  // Show only the deepest landmark passed this round, to keep the reveal compact.
  const passed = LANDMARKS.filter((l) => l.depth > depthBefore && l.depth <= depthAfter).slice(-1);
  const chipRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [settled, setSettled] = useState(!animate);
  const [column] = useState(columnPx);
  const yFor = (metres: number) => (metres / 1000) * column;

  useEffect(() => {
    const chip = chipRef.current;
    if (!animate || !chip) {
      setSettled(true);
      return;
    }
    const target = isMiss ? 0 : (metres / 1000) * column;
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
  }, [animate, isMiss, metres, column]);

  useEffect(() => {
    // preventScroll: keep the sink column in view on short screens.
    if (settled) nextRef.current?.focus({ preventScroll: true });
  }, [settled]);

  return (
    <section className="reveal">
      <p className="reveal-prompt">{prompt.prompt}</p>

      <div className="sink-column" style={{ height: column + 24 }} aria-hidden>
        {LINE_DEPTHS.map(({ tier: t, depth }) => (
          <div
            key={t}
            className={`tier-line tier-${t} ${t === result.outcome && settled ? 'hit' : ''}`}
            style={{ top: yFor(depth) + 12 }}
          >
            <span>
              {TIERS[t].emoji} {TIERS[t].label} · {TIERS[t].points}
            </span>
          </div>
        ))}
        <div
          ref={chipRef}
          className={`chip tier-${result.outcome}`}
          style={settled ? { transform: `translateY(${isMiss ? 0 : yFor(metres)}px)` } : undefined}
        >
          <Bathy scale={2} />
          <span className="chip-tag">{isMiss ? '— — —' : `“${result.answer}”`}</span>
        </div>
      </div>

      <div className={`reveal-text ${settled ? 'show' : ''}`}>
        <h2 className={`tier-title tier-${result.outcome}`}>{tier.label}</h2>
        {!isMiss && <p className="reveal-answer">“{result.answer}”</p>}
        <p className="reveal-points">
          <span className={`tier-${result.outcome}`}>+{tier.points} pts</span>
          {!isMiss && <> · sink {fmt(metres)} m</>}
        </p>
        <p className="reveal-flavour">{tier.flavour}</p>
        {answer && <p className="reveal-fact">{answer.fact}</p>}
        {passed.map((l) => (
          <p key={l.depth} className="reveal-landmark">
            passing {fmt(l.depth)} m: {l.label}
          </p>
        ))}
        <button ref={nextRef} className="btn btn-primary" onClick={onNext} disabled={!settled}>
          {isLast ? 'Surface for results ▲' : 'Descend ▼'}
        </button>
      </div>
    </section>
  );
}
