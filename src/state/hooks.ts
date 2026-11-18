import { useEffect, useState } from 'react';
import type { MotionSetting } from './save';

/** Current time, refreshed every animation frame (or every `intervalMs`). */
export function useNow(intervalMs?: number, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    if (intervalMs) {
      const t = setInterval(() => setNow(Date.now()), intervalMs);
      return () => clearInterval(t);
    }
    let frame = 0;
    const tick = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [intervalMs, active]);
  return now;
}

function systemPrefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True when motion should be cut back, from the setting or the OS preference. */
export function useReducedMotion(setting: MotionSetting): boolean {
  const [system, setSystem] = useState(systemPrefersReducedMotion);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setSystem(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  if (setting === 'reduced') return true;
  if (setting === 'full') return false;
  return system;
}
