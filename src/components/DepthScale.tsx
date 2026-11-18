import { LANDMARKS } from '../logic/landmarks';

interface Props {
  /** Current depth in metres. The ruler scrolls so this sits at the YOU marker. */
  depth: number;
  animate: boolean;
}

/** px per metre on the ruler. 100 m = 24 px. */
const PX_PER_M = 0.24;
const MAX_DEPTH = 7500;
const TICKS = Array.from({ length: MAX_DEPTH / 100 + 1 }, (_, i) => i * 100);

/**
 * The vertical depth ruler on the right edge. Landmarks appear once you've
 * passed them. Text labels only show on wider screens; phones get the dots.
 */
export function DepthScale({ depth, animate }: Props) {
  return (
    <div className="depth-scale" aria-hidden>
      <div
        className="depth-ruler"
        style={{
          transform: `translateY(${-depth * PX_PER_M}px)`,
          transition: animate ? 'transform 1.4s cubic-bezier(.25,.8,.3,1)' : 'none',
        }}
      >
        {TICKS.map((m) => (
          <div key={m} className={`tick ${m % 500 === 0 ? 'major' : ''}`} style={{ top: m * PX_PER_M }}>
            {m % 500 === 0 && <span>{m === 0 ? '0' : `-${m.toLocaleString('en-AU')}`}</span>}
          </div>
        ))}
        {LANDMARKS.map((l) => (
          <div
            key={l.depth}
            className={`landmark ${depth >= l.depth ? 'passed' : ''}`}
            style={{ top: l.depth * PX_PER_M }}
          >
            <span className="landmark-label">{l.label}</span>
          </div>
        ))}
      </div>
      <div className="you-marker">
        <span>YOU</span>
      </div>
    </div>
  );
}
