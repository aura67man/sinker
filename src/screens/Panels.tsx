/** How to Play and Settings, shown in modals from the menu. */
import { PREVIEW_MS, PROMPTS_PER_DIVE, ROUND_MS, TIMEZONE } from '../config';
import { TIERS, TIER_ORDER } from '../logic/tiers';
import type { MotionSetting, Settings } from '../state/save';

export function HowToPlay() {
  return (
    <div className="howto">
      <ol className="howto-steps">
        <li>
          <b>Read the prompt.</b> You get {PREVIEW_MS / 1000} seconds to read it, small print included, before
          you can type.
        </li>
        <li>
          <b>Name one answer</b> in {ROUND_MS / 1000} seconds and hit Dive (or Enter). Wrong guesses just come back
          as "no echo", so keep trying. Typos get a suggestion you can confirm.
        </li>
        <li>
          <b>Rarer sinks deeper.</b> Your first accepted answer locks in, so think before you dive. The obvious
          pick barely gets you wet.
        </li>
      </ol>
      <table className="howto-tiers">
        <tbody>
          {TIER_ORDER.map((t) => (
            <tr key={t}>
              <td className={`tier-${t}`}>
                {TIERS[t].emoji} {TIERS[t].label}
              </td>
              <td>{TIERS[t].points} pts</td>
            </tr>
          ))}
          <tr>
            <td className="tier-miss">⬛ Out of time</td>
            <td>0 pts</td>
          </tr>
        </tbody>
      </table>
      <p className="muted small">
        Each prompt has one hidden Trench Gem 🌟: not always the rarest answer, but the best one to land. Watch
        out for Red Herrings 🎣, the "clever" picks everyone thinks of.
      </p>
      <p className="muted small">
        {PROMPTS_PER_DIVE} prompts a day, the same for everyone. A new dive unlocks at midnight ({TIMEZONE}{' '}
        time). Heads up: the timer keeps running if you switch tabs or reload. No pausing.
      </p>
    </div>
  );
}

interface SettingsProps {
  settings: Settings;
  onChange: (next: Settings) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsProps) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  return (
    <div className="settings">
      <label className="setting">
        <span>
          <b>Skip animations</b>
          <span className="muted small">Answers land instantly instead of sinking.</span>
        </span>
        <input
          type="checkbox"
          checked={settings.skipAnimations}
          onChange={(e) => set({ skipAnimations: e.target.checked })}
        />
      </label>
      <fieldset className="setting">
        <legend>
          <b>Motion</b>
        </legend>
        {(
          [
            ['system', 'Match my device'],
            ['reduced', 'Reduced motion'],
            ['full', 'Full motion'],
          ] as [MotionSetting, string][]
        ).map(([value, label]) => (
          <label key={value} className="radio">
            <input
              type="radio"
              name="motion"
              value={value}
              checked={settings.motion === value}
              onChange={() => set({ motion: value })}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="muted small">Sound, colourblind mode and more arrive in the next update.</p>
    </div>
  );
}
