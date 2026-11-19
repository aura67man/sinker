import { VOLCANO } from '../art/creatures';
import type { SpriteDef } from '../art/sprites';
import { waterColour } from '../art/ocean';
import { LANDMARKS } from '../logic/landmarks';
import { depthForPoints, pointsFor, type RoundResult } from '../logic/scoring';
import { BathyCrew } from './Bathy';
import { PixelSprite } from './PixelSprite';
import { TierIcon } from './TierIcon';

const MAX = 7000;
/** px per metre. 7,000 m ≈ 630 px. */
const SCALE = 0.09;
const fmt = (n: number) => n.toLocaleString('en-AU');

/**
 * The whole water column from surface to trench floor, with the landmarks,
 * the volcano, where each answer took you, and Bathy at your final depth.
 */
export function Descent({ rounds, buddy }: { rounds: readonly RoundResult[]; buddy: SpriteDef | null }) {
  let running = 0;
  const stops = rounds.map((r) => {
    running += depthForPoints(pointsFor(r.outcome));
    return { outcome: r.outcome, depth: running };
  });
  const final = running;
  const gradient = [0, 300, 1000, 3000, 7000].map((d) => `${waterColour(d)} ${(d / MAX) * 100}%`).join(', ');

  return (
    <div className="descent" style={{ height: MAX * SCALE + 40, background: `linear-gradient(${gradient})` }}>
      {[1000, 2000, 3000, 4000, 5000, 6000].map((m) => (
        <div key={m} className="descent-tick" style={{ top: m * SCALE }}>
          {fmt(m)} m
        </div>
      ))}

      {LANDMARKS.map((l) => (
        <div key={l.depth} className={`descent-landmark ${final >= l.depth ? 'passed' : ''}`} style={{ top: l.depth * SCALE }}>
          <span>{l.label}</span>
        </div>
      ))}

      <div className="descent-volcano" style={{ top: 3000 * SCALE - 12 * 3 }}>
        <PixelSprite sprite={VOLCANO} scale={3} />
      </div>

      <div className="descent-path" style={{ height: final * SCALE }} />
      {stops.map((s, i) =>
        s.outcome === 'miss' ? null : (
          <div key={i} className={`descent-stop tier-${s.outcome}`} style={{ top: s.depth * SCALE }}>
            <TierIcon tier={s.outcome} scale={2} />
          </div>
        ),
      )}

      <div className="descent-bathy" style={{ top: final * SCALE }}>
        <BathyCrew buddy={buddy} scale={2} />
        <span className="descent-you">you · {fmt(final)} m</span>
      </div>

      <div className="descent-floor">trench floor · 7,000 m</div>
    </div>
  );
}
