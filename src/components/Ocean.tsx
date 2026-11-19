import { useMemo } from 'react';
import { VOLCANO } from '../art/creatures';
import { snowDensity, waterColour } from '../art/ocean';
import { PixelSprite } from './PixelSprite';
import './ocean.css';

interface Props {
  depth: number;
  reducedMotion: boolean;
  /** Sports pack: a football field instead of water. */
  pitch?: boolean;
}

const FLAKES = 36;

/** Fades in from 2,400 m, full at 3,000 m, gone again by 4,200 m. */
function volcanoOpacity(depth: number): number {
  if (depth < 2400 || depth > 4200) return 0;
  if (depth < 3000) return (depth - 2400) / 600;
  if (depth > 3600) return (4200 - depth) / 600;
  return 1;
}

/**
 * Full-screen water behind everything. Colour eases towards the current
 * depth; "marine snow" drifts upward and thins out as you go deeper.
 */
export function Ocean({ depth, reducedMotion, pitch = false }: Props) {
  // Fixed random layout so flakes don't jump around on re-render.
  const flakes = useMemo(
    () =>
      Array.from({ length: FLAKES }, (_, i) => ({
        left: (i * 37.7) % 100,
        delay: -((i * 1.3) % 14),
        duration: 10 + ((i * 7) % 9),
        size: 1 + (i % 3),
      })),
    [],
  );
  const visible = Math.round(FLAKES * snowDensity(depth));

  if (pitch) {
    return (
      <div className="pitch" aria-hidden>
        <div className="pitch-lines" />
      </div>
    );
  }

  return (
    <div className="ocean" style={{ backgroundColor: waterColour(depth) }} aria-hidden>
      <div className="ocean-light" style={{ opacity: Math.max(0, 1 - depth / 1200) }} />
      {/* The undersea volcano rises into view around 3,000 m. */}
      <div className="ocean-volcano" style={{ opacity: volcanoOpacity(depth) }}>
        <div className="volcano-glow" />
        <PixelSprite sprite={VOLCANO} scale={8} />
      </div>
      {!reducedMotion &&
        flakes.slice(0, visible).map((f, i) => (
          <span
            key={i}
            className="flake"
            style={{
              left: `${f.left}%`,
              width: f.size * 2,
              height: f.size * 2,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`,
            }}
          />
        ))}
    </div>
  );
}
