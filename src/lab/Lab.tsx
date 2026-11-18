/**
 * Phase 1 test bench. Not the game: a plain page for checking the deal,
 * the matching and the data on a real device. The game UI replaces this
 * in Phase 2 (the lab stays reachable at ?lab).
 */
import { useEffect, useMemo, useState } from 'react';
import { DAILY_POOL_IDS, loadPrompts } from '../data';
import { dateKeyAt, dateKeyForDive, dealDive, diveNumberFor, nextMidnight } from '../logic/daily';
import { buildIndex, matchAnswer, type MatchResult } from '../logic/match';
import { depthForPoints } from '../logic/scoring';
import { TIERS, TIER_ORDER } from '../logic/tiers';
import type { Prompt } from '../logic/types';
import { TIMEZONE } from '../config';
import './lab.css';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

const pad = (n: number) => String(n).padStart(2, '0');
function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function Lab() {
  const now = useNow();
  const todayNumber = diveNumberFor(dateKeyAt(now));
  const [diveNumber, setDiveNumber] = useState(todayNumber);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<MatchResult | null>(null);

  const ids = useMemo(() => dealDive(DAILY_POOL_IDS, Math.max(1, diveNumber)), [diveNumber]);

  useEffect(() => {
    let live = true;
    loadPrompts(ids).then((p) => live && setPrompts(p));
    return () => {
      live = false;
    };
  }, [ids]);

  const prompt = prompts[selected];
  const index = useMemo(() => (prompt ? buildIndex(prompt) : null), [prompt]);

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (index) setResult(matchAnswer(input, index));
  }

  function pick(i: number) {
    setSelected(i);
    setResult(null);
    setInput('');
  }

  return (
    <main className="lab">
      <header>
        <h1>SINKER</h1>
        <p className="sub">phase 1 lab · logic &amp; data check</p>
      </header>

      <section className="panel">
        <div className="row">
          <span>
            Today ({TIMEZONE}): <b>{dateKeyAt(now)}</b> · Dive <b>#{todayNumber}</b>
          </span>
          <span>
            Next dive in <b>{formatCountdown(nextMidnight(now) - now)}</b>
          </span>
        </div>
        <label className="row">
          Preview dive #
          <input
            type="number"
            min={1}
            value={diveNumber}
            onChange={(e) => {
              setDiveNumber(Number(e.target.value) || 1);
              pick(0);
            }}
          />
          <span className="muted">{dateKeyForDive(Math.max(1, diveNumber))}</span>
        </label>
        <p className="muted">
          {DAILY_POOL_IDS.length} prompts in the pool → {Math.floor(DAILY_POOL_IDS.length / 7)} fresh days per deck
          cycle.
        </p>
      </section>

      <section className="panel">
        <h2>The seven</h2>
        <ol className="prompts">
          {prompts.map((p, i) => (
            <li key={p.id}>
              <button className={i === selected ? 'active' : ''} onClick={() => pick(i)}>
                {p.prompt}
              </button>
            </li>
          ))}
        </ol>
      </section>

      {prompt && (
        <section className="panel">
          <p className="eyebrow">prompt {selected + 1} of 7</p>
          <h2 className="prompt">{prompt.prompt}</h2>
          {prompt.qualifiers?.length ? <p className="muted">{prompt.qualifiers.join(' · ')}</p> : null}

          <form onSubmit={check} className="answer">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="type one answer…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Answer"
            />
            <button type="submit">Dive</button>
          </form>

          <Result result={result} />

          <details>
            <summary>Tier counts &amp; all answers (spoilers)</summary>
            {TIER_ORDER.map((tier) => {
              const list = prompt.answers.filter((a) => a.tier === tier);
              return (
                <div key={tier} className="tier-group">
                  <h3>
                    {TIERS[tier].emoji} {TIERS[tier].label} · {TIERS[tier].points} pts · {list.length}
                  </h3>
                  <p>{list.map((a) => a.name).join(', ')}</p>
                </div>
              );
            })}
          </details>
        </section>
      )}
    </main>
  );
}

function Result({ result }: { result: MatchResult | null }) {
  if (!result) return null;
  switch (result.kind) {
    case 'empty':
      return <p className="result muted">Type something first.</p>;
    case 'none':
      return <p className="result miss">no echo. try again</p>;
    case 'suggest':
      return (
        <p className="result suggest">
          Did you mean <b>{result.answer.name}</b>? (distance {result.distance}, would need confirming)
        </p>
      );
    case 'exact': {
      const t = TIERS[result.answer.tier];
      return (
        <div className={`result hit tier-${t.id}`}>
          <p className="tier-name">
            {t.emoji} {t.label}
          </p>
          <p>
            “{result.answer.name}” · +{t.points} pts · sink {depthForPoints(t.points).toLocaleString('en-AU')} m
          </p>
          <p className="muted">{t.flavour}</p>
          <p className="fact">{result.answer.fact}</p>
        </div>
      );
    }
  }
}
