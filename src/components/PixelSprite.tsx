import { memo } from 'react';
import type { SpriteDef } from '../art/sprites';

interface Props {
  sprite: SpriteDef;
  /** Size of one pixel in CSS px. */
  scale?: number;
  className?: string;
  title?: string;
}

/**
 * Renders a pixel grid as SVG rects. Runs of the same colour in a row are
 * merged into one rect, which keeps the DOM small and avoids hairline seams.
 */
export const PixelSprite = memo(function PixelSprite({ sprite, scale = 4, className, title }: Props) {
  const width = Math.max(...sprite.rows.map((r) => r.length));
  const height = sprite.rows.length;
  const rects: JSX.Element[] = [];

  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (row[x + run] === ch) run++;
      const fill = sprite.palette[ch];
      if (ch !== '.' && fill) rects.push(<rect key={`${x},${y}`} x={x} y={y} width={run} height={1} fill={fill} />);
      x += run;
    }
  });

  return (
    <svg
      className={className}
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects}
    </svg>
  );
});
