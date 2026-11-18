import { BARGE } from '../art/sprites';
import { Bathy } from '../components/Bathy';
import { PixelSprite } from '../components/PixelSprite';
import { PREVIEW_MS, PROMPTS_PER_DIVE, ROUND_MS } from '../config';
import './title.css';

interface Props {
  diveNumber: number;
  streak: number;
  resuming: boolean;
  onBegin: () => void;
}

export function Title({ diveNumber, streak, resuming, onBegin }: Props) {
  return (
    <main className="title-screen">
      <div className="sky" aria-hidden>
        <div className="sun" />
        <div className="cloud c1" />
        <div className="cloud c2" />
        <div className="surface-scene">
          <PixelSprite sprite={BARGE} scale={4} className="barge" />
          <div className="cable" />
          <Bathy scale={3} className="title-bathy" />
        </div>
        <div className="waterline" />
      </div>

      <div className="title-body">
        <h1 className="game-title">SINKER</h1>
        <p className="tagline">the daily dive</p>
        <p className="rules-line">
          {PROMPTS_PER_DIVE} prompts · {ROUND_MS / 1000} seconds each · rarer answers sink deeper
        </p>

        <button className="btn btn-begin" onClick={onBegin}>
          ▼ {resuming ? 'Resume descent' : 'Begin descent'} ▼
        </button>
        <p className="title-meta">
          dive #{diveNumber} · streak {streak}
        </p>
        <p className="muted small">
          Each prompt shows for {PREVIEW_MS / 1000}s before you can type. The clock never pauses.
        </p>
      </div>
    </main>
  );
}
