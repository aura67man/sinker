/**
 * Top level: owns the save file, decides which screen is showing, and
 * wires the daily deal to the screens.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DAILY_POOL_IDS, loadPrompts } from './data';
import { Modal } from './components/Modal';
import { Ocean } from './components/Ocean';
import { useToast } from './components/Toast';
import { dateKeyAt, dealDive, diveNumberFor } from './logic/daily';
import { depthForPoints, type RoundResult } from './logic/scoring';
import { computeStreak } from './logic/streak';
import type { Prompt } from './logic/types';
import { Dive } from './screens/Dive';
import { HowToPlay, SettingsPanel } from './screens/Panels';
import { Results } from './screens/Results';
import { Title } from './screens/Title';
import { useNow, useReducedMotion } from './state/hooks';
import { finishDive, loadSave, writeSave, type ActiveDive, type SaveData } from './state/save';

type Screen = 'title' | 'dive' | 'results';
type Panel = 'menu' | 'howto' | 'settings' | null;

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

  const reduced = useReducedMotion(save.settings.motion);
  const animate = !reduced && !save.settings.skipAnimations;

  useEffect(() => writeSave(save), [save]);
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  }, [reduced]);

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

  const streak = useMemo(
    () => computeStreak(Object.keys(save.daily).map(Number), today.diveNumber),
    [save.daily, today.diveNumber],
  );

  // ── Dive actions ──────────────────────────────────────────────────────────
  const begin = useCallback(async () => {
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
    update((s) => {
      if (!s.active) return s;
      const done = finishDive(s.active, Date.now());
      return { ...s, active: null, daily: { ...s.daily, [done.diveNumber]: done } };
    });
    setScreen('results');
    window.scrollTo(0, 0);
  }, [update]);

  // ── Render ────────────────────────────────────────────────────────────────
  const oceanDepth =
    screen === 'dive' ? diveDepth : screen === 'results' && finished ? depthForPoints(finished.total) : 0;

  return (
    <>
      <Ocean depth={oceanDepth} reducedMotion={reduced} />

      <button className="icon-btn menu-btn" onClick={() => setPanel('menu')} aria-label="Menu">
        ☰
      </button>

      {screen === 'title' && (
        <Title diveNumber={today.diveNumber} streak={streak.current} resuming={!!save.active} onBegin={begin} />
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
        />
      )}

      {screen === 'results' && finished && (
        <Results dive={finished} prompts={prompts} streak={streak} onToast={toast.show} />
      )}

      <Modal open={panel === 'menu'} title="Menu" onClose={() => setPanel(null)}>
        <nav className="menu-grid">
          <button className="btn" onClick={() => setPanel('howto')}>
            ? How to play
          </button>
          <button className="btn" onClick={() => setPanel('settings')}>
            ⚙ Settings
          </button>
        </nav>
        <p className="muted small">Unlimited, Archive and Stats are on the way.</p>
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
        <SettingsPanel settings={save.settings} onChange={(settings) => update((s) => ({ ...s, settings }))} />
      </Modal>

      {toast.element}
    </>
  );
}
