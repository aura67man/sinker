import { useMemo } from 'react';
import { snowDensity, waterColour } from '../art/ocean';
import './ocean.css';

interface Props {
  depth: number;
  reducedMotion: boolean;
}

const FLAKES = 36;

/**
 * Full-screen water behind everything. Colour eases towards the current
 * depth; "marine snow" drifts upward and thins out as you go deeper.
 */
export function Ocean({ depth, reducedMotion }: Props) {
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

  return (
    <div className="ocean" style={{ backgroundColor: waterColour(depth) }} aria-hidden>
      <div className="ocean-light" style={{ opacity: Math.max(0, 1 - depth / 1200) }} />
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
