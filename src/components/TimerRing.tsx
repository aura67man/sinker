import { ROUND_MS } from '../config';

interface Props {
  /** ms left to answer. */
  timeLeft: number;
  /** ms left in the preview; > 0 shows the small read-only countdown. */
  previewLeft: number;
}

const R = 26;
const CIRC = 2 * Math.PI * R;

/** A ring that drains as the answer time runs out, with seconds in the middle. */
export function TimerRing({ timeLeft, previewLeft }: Props) {
  const inPreview = previewLeft > 0;
  const fraction = inPreview ? 1 : timeLeft / ROUND_MS;
  const seconds = Math.ceil((inPreview ? previewLeft : timeLeft) / 1000);
  const urgent = !inPreview && timeLeft <= 5000;

  return (
    <div
      className={`timer ${urgent ? 'urgent' : ''} ${inPreview ? 'preview' : ''}`}
      role="timer"
      aria-label={inPreview ? `Starting in ${seconds}` : `${seconds} seconds left`}
    >
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden>
        <circle className="timer-track" cx="32" cy="32" r={R} />
        <circle
          className="timer-fill"
          cx="32"
          cy="32"
          r={R}
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - fraction)}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <span className="timer-num">{seconds}</span>
    </div>
  );
}
