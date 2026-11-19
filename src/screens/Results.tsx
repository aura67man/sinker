import { useEffect, useState } from 'react';
import type { SpriteDef } from '../art/sprites';
import { BathyCrew } from '../components/Bathy';
import { Descent } from '../components/Descent';
import { TierIcon } from '../components/TierIcon';
import { PROMPTS_PER_DIVE } from '../config';
import { nextMidnight } from '../logic/daily';
import { estimatedPercentile } from '../logic/percentile';
import { depthForPoints, verdictFor } from '../logic/scoring';
import { buildShareText } from '../logic/share';
import type { StreakInfo } from '../logic/streak';
import { TIERS, TIER_ORDER } from '../logic/tiers';
import type { Prompt } from '../logic/types';
import type { FinishedDive } from '../state/save';
import { useNow } from '../state/hooks';
import './results.css';

const fmt = (n: number) => n.toLocaleString('en-AU');
const pad = (n: number) => String(n).padStart(2, '0');
function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Copy text, with a fallback for browsers without the async clipboard API. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

interface Props {
  dive: FinishedDive;
  prompts: Prompt[] | null;
  streak: StreakInfo;
  onToast: (text: string) => void;
  buddy: SpriteDef | null;
}

export function Results({ dive, prompts, streak, onToast, buddy }: Props) {
  const now = useNow(1000);
  const verdict = verdictFor(dive.total);
  const depth = depthForPoints(dive.total);
  const percentile = estimatedPercentile.percentileFor(dive.total) as number;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function share() {
    const text = buildShareText(`#${dive.diveNumber}`, dive.rounds);
    if (await copyText(text)) {
      setCopied(true);
      onToast('copied!');
    } else {
      onToast("couldn't copy. try a screenshot?");
    }
  }

  return (
    <main className="results">
      <header className="results-head">
        <span className="results-brand">SINKER</span>
        <span className="muted">dive #{dive.diveNumber} complete</span>
      </header>

      <section className="results-hero">
        <BathyCrew buddy={buddy} scale={3} className="results-bathy" />
        <div>
          <p className="results-score">{dive.total}</p>
          <p className="results-depth">-{fmt(depth)} m</p>
        </div>
      </section>

      <section className={`verdict tier-${verdict.tier}`}>
        <h1>{verdict.label}</h1>
        <p>{verdict.line}</p>
        <p className="percentile">
          deeper than ~{percentile}% of divers <span className="muted">(estimate)</span>
        </p>
      </section>

      <section className="share-row">
        <button className="btn btn-primary" onClick={share}>
          {copied ? 'Copied ✓' : 'Share'}
        </button>
        <div className="share-grid" aria-label="Your dive as emoji">
          {dive.rounds.map((r) => TIERS[r.outcome].emoji).join('')}
        </div>
      </section>

      <section className="stats-row">
        <div>
          <span className="stat-num">{streak.current}</span>
          <span className="stat-label">streak</span>
        </div>
        <div>
          <span className="stat-num">{streak.best}</span>
          <span className="stat-label">best streak</span>
        </div>
        <div>
          <span className="stat-num">{countdown(nextMidnight(now) - now)}</span>
          <span className="stat-label">next dive</span>
        </div>
      </section>

      <section className="dive-log">
        <h2 className="section-title">dive log</h2>
        <p className="muted small">Tap a prompt to see every answer that would have counted.</p>
        <ol>
          {dive.rounds.map((r, i) => {
            const prompt = prompts?.[i];
            const tier = TIERS[r.outcome];
            return (
              <li key={r.promptId}>
                <details>
                  <summary>
                    <span className="log-num">{i + 1}</span>
                    <span className="log-main">
                      <span className="log-prompt">{prompt?.prompt ?? '…'}</span>
                      <span className="log-answer">{r.answer ?? 'no answer'}</span>
                    </span>
                    <span className={`log-tier tier-${r.outcome}`}>
                      <TierIcon tier={r.outcome} scale={2} labelled /> {tier.points}
                    </span>
                  </summary>
                  {prompt && <AnswerReveal prompt={prompt} yours={r.answer} />}
                </details>
              </li>
            );
          })}
        </ol>
        {dive.rounds.length < PROMPTS_PER_DIVE && <p className="muted">This dive wasn't finished.</p>}
      </section>

      <section className="descent-section">
        <h2 className="section-title">your descent</h2>
        <Descent rounds={dive.rounds} buddy={buddy} />
      </section>

      <section className="bearing">
        <h2 className="section-title">the bearing</h2>
        <ul>
          {[...TIER_ORDER, 'miss' as const].map((t) => (
            <li key={t}>
              <span className={`tier-${t}`}>
                <TierIcon tier={t} scale={1} /> {TIERS[t].label}
              </span>
              <span>{TIERS[t].points} pts</span>
              <span className="muted">{TIERS[t].flavour}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

/** Every accepted answer for a prompt, grouped by tier, deepest first. */
function AnswerReveal({ prompt, yours }: { prompt: Prompt; yours?: string }) {
  return (
    <div className="answer-reveal">
      {[...TIER_ORDER].reverse().map((t) => {
        const list = prompt.answers.filter((a) => a.tier === t);
        if (!list.length) return null;
        return (
          <div key={t} className="reveal-group">
            <h3 className={`tier-${t}`}>
              <TierIcon tier={t} scale={1} /> {TIERS[t].label}
            </h3>
            <p>
              {list.map((a, i) => (
                <span key={a.name}>
                  {i > 0 && ', '}
                  <span className={a.name === yours ? 'yours' : undefined}>{a.name}</span>
                </span>
              ))}
            </p>
          </div>
        );
      })}
    </div>
  );
}
