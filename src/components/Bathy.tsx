import { useEffect, useState } from 'react';
import { BATHY, BATHY_BLINK } from '../art/sprites';
import { PixelSprite } from './PixelSprite';

/** The mascot. Blinks every few seconds; the idle wiggle is CSS (.bathy). */
export function Bathy({ scale = 4, className = '' }: { scale?: number; className?: string }) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        t = setTimeout(() => {
          setBlink(false);
          loop();
        }, 140);
      }, 2500 + Math.random() * 3000);
    };
    loop();
    return () => clearTimeout(t);
  }, []);
  return (
    <span className={`bathy ${className}`}>
      <PixelSprite sprite={blink ? BATHY_BLINK : BATHY} scale={scale} title="Bathy" />
    </span>
  );
}
