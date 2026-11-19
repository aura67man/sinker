import { OCEAN, type Theme } from '../logic/theme';

interface Props {
  /** Current distance in the theme's units (metres of depth, or yards). */
  distance: number;
  animate: boolean;
  theme?: Theme;
}

/**
 * The vertical ruler on the right edge. Landmarks appear once you've passed
 * them. Text labels only show on wider screens; phones get the dots.
 */
export function DepthScale({ distance, animate, theme = OCEAN }: Props) {
  const { pxPerUnit, minor, major, max } = theme.ruler;
  const ticks = Array.from({ length: max / minor + 1 }, (_, i) => i * minor);
  const sign = theme.negative ? '-' : '';
  return (
    <div className={`depth-scale theme-${theme.id}`} aria-hidden>
      <div
        className="depth-ruler"
        style={{
          transform: `translateY(${-distance * pxPerUnit}px)`,
          transition: animate ? 'transform 1.4s cubic-bezier(.25,.8,.3,1)' : 'none',
        }}
      >
        {ticks.map((m) => (
          <div key={m} className={`tick ${m % major === 0 ? 'major' : ''}`} style={{ top: m * pxPerUnit }}>
            {m % major === 0 && <span>{m === 0 ? '0' : `${sign}${m.toLocaleString('en-AU')}`}</span>}
          </div>
        ))}
        {theme.landmarks.map((l) => (
          <div
            key={l.depth}
            className={`landmark ${distance >= l.depth ? 'passed' : ''}`}
            style={{ top: l.depth * pxPerUnit }}
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
