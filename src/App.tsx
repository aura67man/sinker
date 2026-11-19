/**
 * Top level: owns the save file, decides which screen is showing, and wires
 * the three dive modes (daily, unlimited, archive), sound and settings to
 * the screens.
 *
 * Only one dive can be in progress at a time. The daily dive can't be
 * abandoned (that would let you peek at prompts and restart); Unlimited and
 * Archive dives can.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buddyById, BUDDIES } from './art/creatures';
import { sound } from './audio/sound';
import { DAILY_POOL_IDS, loadPrompts } from './data';
import { Modal } from './components/Modal';
import { Ocean } from './components/Ocean';
import { useToast } from './components/Toast';
import { dateKeyAt, dateKeyForDive, dealDive, dealUnlimited, diveNumberFor } from './logic/daily';
import { depthForPoints, type RoundResult } from './logic/scoring';
import { computeStats, STREAK_MILESTONES } from './logic/stats';
import { computeStreak } from './logic/streak';
import type { Prompt } from './logic/types';
import { Dive } from './screens/Dive';
import { ArchivePanel, BuddiesPanel, HowToPlay, SettingsPanel, StatsPanel } from './screens/Panels';
import { Results } from './screens/Results';
import { Title } from './screens/Title';
import { useNow, useReducedMotion } from './state/hooks';
import {
  finishDive,
  loadSave,
  recordFinished,
  writeSave,
  type DiveMode,
  type FinishedDive,
  type SaveData,
} from './state/save';

type Screen = 'title' | 'dive' | 'results';
type Panel = 'menu' | 'howto' | 'settings' | 'stats' | 'buddies' | 'archive' | null;
/** Which finished dive the results screen shows. null = today's daily. */
type Viewing = { mode: DiveMode; diveNumber: number } | null;

function initialSave(): SaveData {
  const save = loadSave();
  const today = diveNumberFor(dateKeyAt(Date.now()));
  // An unfinished *daily* dive from an earlier day can't be finished now: drop it.
  if (save.active?.mode === 'daily' && save.active.diveNumber !== today) save.active = null;
  return save;
}

function findFinished(save: SaveData, viewing: Viewing, today: number): FinishedDive | undefined {
  if (!viewing) return save.daily[today];
  if (viewing.mode === 'unlimited') return save.unlimited.history.find((d) => d.diveNumber === viewing.diveNumber);
  if (viewing.mode === 'archive') return save.archive[viewing.diveNumber];
  return save.daily[viewing.diveNumber];
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
    if (save.active) return 'dive';
    if (save.daily[today.diveNumber]) return 'results';
    return 'title';
  });
  const [viewing, setViewing] = useState<Viewing>(null);
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

  // Which finished dive the results screen is showing, and which prompts we need.
  const viewed = findFinished(save, viewing, today.diveNumber);
  const neededIds = screen === 'results' && viewed ? viewed.promptIds : (save.active?.promptIds ?? today.promptIds);
  const neededKey = neededIds.join('|');
  useEffect(() => {
    let live = true;
    setPrompts(null);
    loadPrompts(neededKey.split('|')).then((p) => live && setPrompts(p));
    return () => {
      live = false;
    };
  }, [neededKey]);

  // Midnight rollover: results for yesterday's daily give way to the new title screen.
  useEffect(() => {
    if (screen === 'results' && !viewed) setScreen('title');
  }, [screen, viewed]);

  const completedNumbers = useMemo(() => Object.keys(save.daily).map(Number), [save.daily]);
  const streak = useMemo(() => computeStreak(completedNumbers, today.diveNumber), [completedNumbers, today.diveNumber]);
  const stats = useMemo(() => computeStats(Object.values(save.daily)), [save.daily]);
  const buddy = buddyById(save.buddy);
  const buddySprite = streak.best >= buddy.unlockStreak ? buddy.sprite : null;

  // ── Starting dives ────────────────────────────────────────────────────────

  /**
   * One dive at a time. If another dive is already going, resume it instead
   * (and say why) rather than silently throwing it away.
   */
  const blockedByActive = useCallback(
    (mode: DiveMode): boolean => {
      const active = save.active;
      if (!active || active.mode === mode) return false;
      toast.show(
        active.mode === 'daily'
          ? "Finish today's dive first"
          : `Finish or abandon your ${active.mode === 'unlimited' ? 'endless' : 'archive'} dive first`,
      );
      setPanel(null);
      setScreen('dive');
      return true;
    },
    [save.active, toast],
  );

  const startDive = useCallback(
    async (mode: DiveMode, diveNumber: number, promptIds: string[], diveDateKey: string) => {
      sound.unlock();
      // Make sure the prompts are downloaded before the clock starts.
      await loadPrompts(promptIds);
      update((s) => ({
        ...s,
        active: { mode, diveNumber, dateKey: diveDateKey, promptIds, rounds: [], roundStartedAt: Date.now() },
        unlimited: mode === 'unlimited' ? { ...s.unlimited, next: diveNumber + 1 } : s.unlimited,
      }));
      setPanel(null);
      setScreen('dive');
      window.scrollTo(0, 0);
    },
    [update],
  );

  const beginDaily = useCallback(async () => {
    if (blockedByActive('daily')) return;
    if (save.active) {
      // Resuming today's dive.
      setScreen('dive');
      return;
    }
    if (save.daily[today.diveNumber]) {
      setViewing(null);
      setScreen('results');
      return;
    }
    await startDive('daily', today.diveNumber, today.promptIds, today.dateKey);
  }, [blockedByActive, save.active, save.daily, today, startDive]);

  const beginUnlimited = useCallback(async () => {
    if (blockedByActive('unlimited')) return;
    if (save.active) {
      setPanel(null);
      setScreen('dive');
      return;
    }
    const n = save.unlimited.next;
    await startDive('unlimited', n, dealUnlimited(DAILY_POOL_IDS, n, today.promptIds), today.dateKey);
  }, [blockedByActive, save.active, save.unlimited.next, today, startDive]);

  const openArchive = useCallback(() => {
    if (blockedByActive('archive')) return;
    if (save.active) {
      setPanel(null);
      setScreen('dive');
      return;
    }
    setPanel('archive');
  }, [blockedByActive, save.active]);

  const playArchive = useCallback(
    async (n: number) => {
      // Use the prompts you actually had that day, if you played it.
      const ids = save.daily[n]?.promptIds ?? dealDive(DAILY_POOL_IDS, n);
      await startDive('archive', n, ids, dateKeyForDive(n));
    },
    [save.daily, startDive],
  );

  const abandon = useCallback(() => {
    update((s) => (s.active && s.active.mode !== 'daily' ? { ...s, active: null } : s));
    setPanel(null);
    setViewing(null);
    setScreen(save.daily[today.diveNumber] ? 'results' : 'title');
    toast.show('Dive abandoned');
  }, [update, save.daily, today.diveNumber, toast]);

  // ── During a dive ─────────────────────────────────────────────────────────

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
    update((s) => recordFinished(s, done));
    setViewing(done.mode === 'daily' ? null : { mode: done.mode, diveNumber: done.diveNumber });
    setScreen('results');
    window.scrollTo(0, 0);
    sound.fanfare();

    // Streaks and buddies only move with the daily dive.
    if (done.mode !== 'daily') return;
    const daily = { ...save.daily, [done.diveNumber]: done };
    const before = computeStreak(Object.keys(save.daily).map(Number), done.diveNumber);
    const after = computeStreak(Object.keys(daily).map(Number), done.diveNumber);
    const unlocked = BUDDIES.find((b) => b.unlockStreak > before.best && b.unlockStreak <= after.best);
    if (unlocked) toast.show(`New dive buddy: ${unlocked.name}!`);
    else if ((STREAK_MILESTONES as readonly number[]).includes(after.current)) {
      toast.show(`${after.current}-day streak!`);
    }
  }, [save.active, save.daily, update, toast]);

  // ── Render ────────────────────────────────────────────────────────────────
  const oceanDepth = screen === 'dive' ? diveDepth : screen === 'results' && viewed ? depthForPoints(viewed.total) : 0;
  useEffect(() => sound.setDepth(oceanDepth), [oceanDepth]);

  const canAbandon = screen === 'dive' && save.active && save.active.mode !== 'daily';

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
          resuming={save.active?.mode === 'daily'}
          onBegin={beginDaily}
          onUnlimited={beginUnlimited}
          onArchive={openArchive}
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

      {screen === 'results' && viewed && (
        <Results
          dive={viewed}
          prompts={prompts}
          streak={streak}
          onToast={toast.show}
          buddy={buddySprite}
          onUnlimited={beginUnlimited}
          onArchive={openArchive}
        />
      )}

      <Modal open={panel === 'menu'} title="Menu" onClose={() => setPanel(null)}>
        <nav className="menu-grid">
          <button
            className="btn"
            onClick={() => {
              setPanel(null);
              void beginDaily();
            }}
          >
            ▼ Daily dive
          </button>
          <button className="btn" onClick={beginUnlimited}>
            ∞ Unlimited
          </button>
          <button className="btn" onClick={openArchive}>
            ⟲ Archive
          </button>
          <button className="btn" onClick={() => setPanel('stats')}>
            ▤ Stats
          </button>
          <button className="btn" onClick={() => setPanel('buddies')}>
            ◉ Buddies
          </button>
          <button className="btn" onClick={() => setPanel('howto')}>
            ? How to play
          </button>
          <button className="btn" onClick={() => setPanel('settings')}>
            ⚙ Settings
          </button>
        </nav>
        {canAbandon && (
          <button className="btn btn-abandon" onClick={abandon}>
            Abandon this {save.active?.mode === 'unlimited' ? 'endless' : 'archive'} dive
          </button>
        )}
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
        <StatsPanel stats={stats} streak={streak} endless={save.unlimited.history} />
      </Modal>

      <Modal open={panel === 'buddies'} title="Dive buddies" onClose={() => setPanel(null)}>
        <BuddiesPanel
          bestStreak={streak.best}
          selected={save.buddy}
          onSelect={(id) => update((s) => ({ ...s, buddy: id }))}
        />
      </Modal>

      <Modal open={panel === 'archive'} title="Archive" onClose={() => setPanel(null)}>
        <ArchivePanel today={today.diveNumber} daily={save.daily} archive={save.archive} onPlay={playArchive} />
      </Modal>

      {toast.element}
    </>
  );
}
