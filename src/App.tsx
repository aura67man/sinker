/**
 * Top level: owns the save file, decides which screen is showing, and
 * wires the daily deal, sound and settings to the screens.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buddyById, BUDDIES } from './art/creatures';
import { sound } from './audio/sound';
import { DAILY_POOL_IDS, loadPrompts } from './data';
import { Modal } from './components/Modal';
import { Ocean } from './components/Ocean';
import { useToast } from './components/Toast';
import { dateKeyAt, dealDive, diveNumberFor } from './logic/daily';
import { depthForPoints, type RoundResult } from './logic/scoring';
import { computeStats, STREAK_MILESTONES } from './logic/stats';
import { computeStreak } from './logic/streak';
import type { Prompt } from './logic/types';
import { Dive } from './screens/Dive';
import { BuddiesPanel, HowToPlay, SettingsPanel, StatsPanel } from './screens/Panels';
import { Results } from './screens/Results';
import { Title } from './screens/Title';
import { useNow, useReducedMotion } from './state/hooks';
import { finishDive, loadSave, writeSave, type ActiveDive, type SaveData } from './state/save';

type Screen = 'title' | 'dive' | 'results';
type Panel = 'menu' | 'howto' | 'settings' | 'stats' | 'buddies' | null;

function initialSave(): SaveData {
  const save = loadSave();
  const today = diveNumberFor(dateKeyAt(Date.now()));
  // An unfinished dive from an earlier day can't be finished now: drop it.
  if (save.active && save.active.diveNumber !== today) save.active = null;
  return save;
}

export function App() {
  const [save, setSave] = useState<SaveData>(initialSave);
  const now = useNow(1000);
  const dateKey = dateKeyAt(now);
  const today = useMemo(() => {
    const diveNumber = diveNumberFor(dateKey);
    return { dateKey, diveNumber, promptIds: dealDive(DAILY_POOL_IDS, Math.max(1, diveNumber)) };
  }, [dateKey]);

  const [screen, setScreen] = useState<Screen>(() => {
    if (save.daily[today.diveNumber]) return 'results';
    if (save.active) return 'dive';
    return 'title';
  });
  const [panel, setPanel] = useState<Panel>(save.seenHowTo ? null : 'howto');
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [diveDepth, setDiveDepth] = useState(0);
  const toast = useToast();
  const { settings } = save;

  const reduced = useReducedMotion(settings.motion);
  const animate = !reduced && !settings.skipAnimations;

  useEffect(() => writeSave(save), [save]);
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
    document.documentElement.dataset.colourblind = settings.colourblind ? 'on' : 'off';
  }, [reduced, settings.colourblind]);

  // Keep the sound engine in step with settings. Browsers need a user
  // gesture before audio can start, so unlock on every tap.
  useEffect(() => {
    sound.setEnabled(settings.sound);
    sound.setVolume(settings.volume);
    sound.setAmbient(settings.ambient);
  }, [settings.sound, settings.volume, settings.ambient]);
  useEffect(() => {
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const update = useCallback((fn: (s: SaveData) => SaveData) => setSave((s) => fn(s)), []);

  // Which prompts the current screen needs.
  const finished = save.daily[today.diveNumber];
  const neededIds = screen === 'results' && finished ? finished.promptIds : (save.active?.promptIds ?? today.promptIds);
  const neededKey = neededIds.join('|');
  useEffect(() => {
    let live = true;
    setPrompts(null);
    loadPrompts(neededKey.split('|')).then((p) => live && setPrompts(p));
    return () => {
      live = false;
    };
  }, [neededKey]);

  // Midnight rollover: results for yesterday give way to the new title screen.
  useEffect(() => {
    if (screen === 'results' && !save.daily[today.diveNumber]) setScreen('title');
  }, [screen, save.daily, today.diveNumber]);

  const completedNumbers = useMemo(() => Object.keys(save.daily).map(Number), [save.daily]);
  const streak = useMemo(() => computeStreak(completedNumbers, today.diveNumber), [completedNumbers, today.diveNumber]);
  const stats = useMemo(() => computeStats(Object.values(save.daily)), [save.daily]);
  const buddy = buddyById(save.buddy);
  // A buddy only shows if it's still unlocked (it always is, best streak never drops).
  const buddySprite = streak.best >= buddy.unlockStreak ? buddy.sprite : null;

  // ── Dive actions ──────────────────────────────────────────────────────────
  const begin = useCallback(async () => {
    sound.unlock();
    // Make sure the prompts are downloaded before the clock starts.
    await loadPrompts(save.active?.promptIds ?? today.promptIds);
    update((s) => {
      const active: ActiveDive = s.active ?? {
        diveNumber: today.diveNumber,
        dateKey: today.dateKey,
        promptIds: today.promptIds,
        rounds: [],
        roundStartedAt: null,
      };
      const startNow = active.roundStartedAt === null && active.rounds.length === 0;
      return { ...s, active: startNow ? { ...active, roundStartedAt: Date.now() } : active };
    });
    setScreen('dive');
  }, [save.active?.promptIds, today, update]);

  const onRoundResult = useCallback(
    (result: RoundResult) =>
      update((s) =>
        s.active ? { ...s, active: { ...s.active, rounds: [...s.active.rounds, result], roundStartedAt: null } } : s,
      ),
    [update],
  );

  const onNextRound = useCallback(
    () => update((s) => (s.active ? { ...s, active: { ...s.active, roundStartedAt: Date.now() } } : s)),
    [update],
  );

  const onFinish = useCallback(() => {
    if (!save.active) return;
    const done = finishDive(save.active, Date.now());
    const daily = { ...save.daily, [done.diveNumber]: done };
    const before = computeStreak(Object.keys(save.daily).map(Number), done.diveNumber);
    const after = computeStreak(Object.keys(daily).map(Number), done.diveNumber);

    update((s) => ({ ...s, active: null, daily }));
    setScreen('results');
    window.scrollTo(0, 0);
    sound.fanfare();

    // Celebrate streak milestones and newly unlocked buddies.
    const unlocked = BUDDIES.find((b) => b.unlockStreak > before.best && b.unlockStreak <= after.best);
    if (unlocked) toast.show(`New dive buddy: ${unlocked.name}!`);
    else if ((STREAK_MILESTONES as readonly number[]).includes(after.current)) {
      toast.show(`${after.current}-day streak!`);
    }
  }, [save.active, save.daily, update, toast]);

  // ── Render ────────────────────────────────────────────────────────────────
  const oceanDepth =
    screen === 'dive' ? diveDepth : screen === 'results' && finished ? depthForPoints(finished.total) : 0;
  useEffect(() => sound.setDepth(oceanDepth), [oceanDepth]);

  return (
    <>
      <Ocean depth={oceanDepth} reducedMotion={reduced} />

      <button className="icon-btn menu-btn" onClick={() => setPanel('menu')} aria-label="Menu">
        ☰
      </button>
      <button
        className="icon-btn sound-btn"
        onClick={() => update((s) => ({ ...s, settings: { ...s.settings, sound: !s.settings.sound } }))}
        aria-label={settings.sound ? 'Mute sound' : 'Turn sound on'}
        aria-pressed={settings.sound}
      >
        {settings.sound ? '🔊' : '🔇'}
      </button>

      {screen === 'title' && (
        <Title
          diveNumber={today.diveNumber}
          streak={streak.current}
          resuming={!!save.active}
          onBegin={begin}
          buddy={buddySprite}
        />
      )}

      {screen === 'dive' && save.active && prompts && (
        <Dive
          active={save.active}
          prompts={prompts}
          animate={animate}
          onRoundResult={onRoundResult}
          onNextRound={onNextRound}
          onFinish={onFinish}
          onDepthChange={setDiveDepth}
          buddy={buddySprite}
          colourblind={settings.colourblind}
        />
      )}

      {screen === 'results' && finished && (
        <Results dive={finished} prompts={prompts} streak={streak} onToast={toast.show} buddy={buddySprite} />
      )}

      <Modal open={panel === 'menu'} title="Menu" onClose={() => setPanel(null)}>
        <nav className="menu-grid">
          <button className="btn" onClick={() => setPanel('howto')}>
            ? How to play
          </button>
          <button className="btn" onClick={() => setPanel('stats')}>
            ▤ Stats
          </button>
          <button className="btn" onClick={() => setPanel('buddies')}>
            ◉ Buddies
          </button>
          <button className="btn" onClick={() => setPanel('settings')}>
            ⚙ Settings
          </button>
        </nav>
        <p className="muted small">Unlimited and Archive dives are on the way.</p>
      </Modal>

      <Modal
        open={panel === 'howto'}
        title="How to play"
        onClose={() => {
          setPanel(null);
          if (!save.seenHowTo) update((s) => ({ ...s, seenHowTo: true }));
        }}
      >
        <HowToPlay />
      </Modal>

      <Modal open={panel === 'settings'} title="Settings" onClose={() => setPanel(null)}>
        <SettingsPanel settings={settings} onChange={(next) => update((s) => ({ ...s, settings: next }))} />
      </Modal>

      <Modal open={panel === 'stats'} title="Stats" onClose={() => setPanel(null)}>
        <StatsPanel stats={stats} streak={streak} />
      </Modal>

      <Modal open={panel === 'buddies'} title="Dive buddies" onClose={() => setPanel(null)}>
        <BuddiesPanel
          bestStreak={streak.best}
          selected={save.buddy}
          onSelect={(id) => update((s) => ({ ...s, buddy: id }))}
        />
      </Modal>

      {toast.element}
    </>
  );
}
