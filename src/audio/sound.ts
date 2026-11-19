/**
 * Every sound in the game. Effects and music are recorded clips generated
 * with ElevenLabs (files in public/audio). Each effect also has a small
 * synthesised version, used until its clip has loaded or if loading fails,
 * so the game never goes silent.
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is
 * created lazily by `unlock()`, which the app calls from click handlers.
 * Sound is off by default (people play this in class).
 */
import type { Outcome } from '../logic/tiers';

/** Clip names, matching public/audio/<name>.mp3. */
type Clip = 'ping' | 'tick' | 'thud' | 'splash' | 'chime' | 'chime-rare' | 'gem' | 'fanfare';
const CLIPS: Clip[] = ['ping', 'tick', 'thud', 'splash', 'chime', 'chime-rare', 'gem', 'fanfare'];
const MUSIC = ['music-shallows', 'music-abyss'] as const;
/** The music loops are exactly this long; the mp3 adds a few ms of padding past it. */
const LOOP_SECONDS = 60;
/** Music sits under the effects. */
const MUSIC_LEVEL = 0.32;
/** Depth (m) at which the music has fully crossfaded to the abyss loop. */
const ABYSS_DEPTH = 3000;

/** Per-tier clip, pitch and level: deeper tiers ring lower. */
const TIER_CHIME: Record<Exclude<Outcome, 'gem' | 'miss'>, { clip: Clip; rate: number; gain: number }> = {
  shallows: { clip: 'chime', rate: 1.12, gain: 0.8 },
  'red-herring': { clip: 'chime', rate: 0.94, gain: 0.8 },
  shoal: { clip: 'chime', rate: 0.84, gain: 0.9 },
  twilight: { clip: 'chime-rare', rate: 1, gain: 0.9 },
  abyssal: { clip: 'chime-rare', rate: 0.8, gain: 1 },
};

const audioUrl = (name: string) => `${import.meta.env.BASE_URL}audio/${name}.mp3`;

type Ctx = AudioContext;

class SoundEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private echo: DelayNode | null = null;
  private enabled = false;
  private volume = 0.6;
  private drone: { gain: GainNode; filter: BiquadFilterNode; oscs: OscillatorNode[] } | null = null;
  private ambientWanted = false;
  private ambientDepth = 0;
  /** Decoded clips. A missing entry means "not loaded (yet)": use the synth. */
  private clips = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private music: { bus: GainNode; filter: BiquadFilterNode; layers: GainNode[]; sources: AudioBufferSourceNode[] } | null =
    null;
  /** Bumped whenever the music should stop, so a slow load can't start it late. */
  private musicGeneration = 0;

  /** Create/resume the audio context. Call from a user gesture. */
  unlock(): void {
    if (!this.enabled) return;
    try {
      // Before the context exists, so iOS creates it in playback mode.
      this.unmuteIOS();
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
        // A shared watery echo, used by pings and chimes.
        this.echo = this.ctx.createDelay(1);
        this.echo.delayTime.value = 0.28;
        const feedback = this.ctx.createGain();
        feedback.gain.value = 0.32;
        const wet = this.ctx.createBiquadFilter();
        wet.type = 'lowpass';
        wet.frequency.value = 1800;
        this.echo.connect(wet).connect(feedback).connect(this.echo);
        wet.connect(this.master);
      }
      if (this.ctx.state !== 'running') {
        this.wake();
        // iOS only lets a context make sound once something has played inside
        // a tap, so play one silent sample right now.
        const blip = this.ctx.createBufferSource();
        blip.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
        blip.connect(this.ctx.destination);
        blip.start();
      }
      CLIPS.forEach((c) => void this.load(c));
      this.syncAmbient();
    } catch (err) {
      this.note('unlock', err);
    }
  }

  /** Resume a suspended or iOS-"interrupted" context, noting why if it refuses. */
  private wake(): void {
    if (!this.ctx || this.ctx.state === 'running') return;
    this.ctx.resume().catch((err) => this.note('resume', err));
  }

  /** The last thing that went wrong, for the status line in Settings. */
  private lastError = '';
  private note(where: string, err: unknown): void {
    this.lastError = `${where}: ${err instanceof Error ? err.message || err.name : String(err)}`;
  }

  /** One line describing the engine, shown in Settings so a player can tell what's up. */
  status(): string {
    if (!this.enabled) return 'Sound is off.';
    if (!this.ctx) return 'Not started yet. Tap anywhere.';
    const clips = CLIPS.filter((c) => this.clips.has(c)).length;
    const music = this.music ? 'playing' : this.drone ? 'fallback drone' : this.ambientWanted ? 'loading' : 'off';
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession?.type;
    return [
      `Engine ${this.ctx.state}`,
      `${clips}/${CLIPS.length} sounds loaded`,
      `music ${music}`,
      session ? `session ${session}` : '',
      this.lastError ? `last error: ${this.lastError}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }

  /** Plays the gem sound now (for the Test button). Call from a tap. */
  test(): void {
    this.unlock();
    this.chime('gem');
  }

  /**
   * iPhones mute web audio while the ring/silent switch is on silent (Safari
   * and Chrome alike: both are WebKit). Playing a real media element once,
   * from a tap, moves the page into "playback" mode like a video would.
   * Safari 16.4+ also has navigator.audioSession for the same thing.
   */
  private unmuted = false;
  private unmuteIOS(): void {
    if (this.unmuted) return;
    this.unmuted = true;
    try {
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session && session.type !== 'playback') session.type = 'playback';
      const el = new Audio(audioUrl('silence'));
      el.setAttribute('playsinline', '');
      el.volume = 0.01;
      void el.play().catch(() => {
        this.unmuted = false; // not a real tap yet: try again on the next one
      });
    } catch {
      // Not available: nothing to do.
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) this.unlock();
    this.syncAmbient();
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  /** Ambient drone on/off (only audible while sound is enabled). */
  setAmbient(on: boolean): void {
    this.ambientWanted = on;
    this.syncAmbient();
  }

  /** The drone darkens and drops in pitch as you descend. */
  setDepth(depth: number): void {
    this.ambientDepth = depth;
    this.applyMusicDepth(1.2);
    if (!this.drone || !this.ctx) return;
    const t = this.ctx.currentTime;
    const k = Math.min(1, depth / 7000);
    this.drone.filter.frequency.setTargetAtTime(700 - 560 * k, t, 1.2);
    this.drone.oscs.forEach((o, i) => o.frequency.setTargetAtTime((i ? 55.4 : 55) * (1 - 0.35 * k), t, 1.5));
  }

  // ── Effects ───────────────────────────────────────────────────────────────

  /** Soft sonar ping when a prompt appears. */
  ping(): void {
    if (this.clip('ping', { gain: 0.55 })) return;
    this.play((ctx, out) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1320, t);
      osc.frequency.exponentialRampToValueAtTime(1180, t + 0.4);
      const g = env(ctx, t, 0.005, 0.5, 0.35);
      osc.connect(g).connect(out);
      g.connect(this.echo!);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  /** Last-five-seconds heartbeat: a soft double thump. */
  tick(): void {
    if (this.clip('tick', { gain: 0.45 })) return;
    this.play((ctx, out) => {
      const t = ctx.currentTime;
      [0, 0.14].forEach((dt, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(i ? 70 : 85, t + dt);
        osc.frequency.exponentialRampToValueAtTime(40, t + dt + 0.12);
        const g = env(ctx, t + dt, 0.004, 0.14, i ? 0.35 : 0.5);
        osc.connect(g).connect(out);
        osc.start(t + dt);
        osc.stop(t + dt + 0.2);
      });
    });
  }

  /** "No echo": a muffled thud. */
  thud(): void {
    if (this.clip('thud', { gain: 0.8 })) return;
    this.play((ctx, out) => {
      const t = ctx.currentTime;
      const noise = noiseSource(ctx, 0.3);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 260;
      const g = env(ctx, t, 0.003, 0.25, 0.7);
      noise.connect(lp).connect(g).connect(out);
      noise.start(t);
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.2);
      const g2 = env(ctx, t, 0.003, 0.22, 0.45);
      osc.connect(g2).connect(out);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /** Answer accepted: a splash, bubbles, and a falling "sink" tone. */
  splashAndSink(durationS = 1.3): void {
    if (this.clip('splash', { gain: 0.7 })) return;
    this.play((ctx, out) => {
      const t = ctx.currentTime;
      // Splash: a band of noise sweeping down.
      const noise = noiseSource(ctx, 0.5);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(2400, t);
      bp.frequency.exponentialRampToValueAtTime(400, t + 0.35);
      const g = env(ctx, t, 0.005, 0.35, 0.35);
      noise.connect(bp).connect(g).connect(out);
      noise.start(t);
      // Bubbles: short rising blips.
      for (let i = 0; i < 6; i++) {
        const bt = t + 0.05 + i * 0.07 + Math.random() * 0.04;
        const osc = ctx.createOscillator();
        const f = 500 + Math.random() * 700;
        osc.frequency.setValueAtTime(f, bt);
        osc.frequency.exponentialRampToValueAtTime(f * 1.8, bt + 0.06);
        const bg = env(ctx, bt, 0.002, 0.07, 0.12);
        osc.connect(bg).connect(out);
        osc.start(bt);
        osc.stop(bt + 0.1);
      }
      // The sink: a soft tone gliding down.
      const sink = ctx.createOscillator();
      sink.type = 'triangle';
      sink.frequency.setValueAtTime(520, t + 0.1);
      sink.frequency.exponentialRampToValueAtTime(110, t + 0.1 + durationS);
      const sg = env(ctx, t + 0.1, 0.08, durationS, 0.18);
      sink.connect(sg).connect(out);
      sink.start(t + 0.1);
      sink.stop(t + 0.2 + durationS);
    });
  }

  /** Settle chime: lower and more resonant the deeper the tier. Gem gets a sparkly arpeggio. */
  chime(outcome: Outcome): void {
    if (outcome === 'gem') {
      if (this.clip('gem', { gain: 0.9 })) return;
      return this.gemArpeggio();
    }
    if (outcome === 'miss') {
      if (this.clip('thud', { gain: 0.45, rate: 0.8 })) return;
    } else {
      const { clip, rate, gain } = TIER_CHIME[outcome];
      if (this.clip(clip, { rate, gain })) {
        if (outcome === 'red-herring') this.wahWah();
        return;
      }
    }
    this.play((ctx, out) => {
      const t = ctx.currentTime;
      if (outcome === 'miss') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 98;
        const g = env(ctx, t, 0.02, 0.6, 0.25);
        osc.connect(g).connect(out);
        osc.start(t);
        osc.stop(t + 0.8);
        return;
      }
      const base: Record<string, number> = { shallows: 880, 'red-herring': 740, shoal: 587, twilight: 440, abyssal: 294 };
      const decay: Record<string, number> = { shallows: 0.5, 'red-herring': 0.5, shoal: 0.9, twilight: 1.4, abyssal: 2.2 };
      const f = base[outcome];
      // A bell: fundamental plus inharmonic partials.
      [1, 2.76, 5.4].forEach((mult, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f * mult;
        const g = env(ctx, t, 0.004, decay[outcome] / (i + 1), 0.32 / (i + 1));
        osc.connect(g).connect(out);
        if (i === 0) g.connect(this.echo!);
        osc.start(t);
        osc.stop(t + decay[outcome] + 0.1);
      });
      // Red Herring gets a little "wah-wah" dip: you took the bait.
      if (outcome === 'red-herring') {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, t + 0.15);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.5);
        const g = env(ctx, t + 0.15, 0.02, 0.4, 0.15);
        osc.connect(g).connect(out);
        osc.start(t + 0.15);
        osc.stop(t + 0.6);
      }
    });
  }

  /** Quiet four-note fanfare for the results screen. */
  fanfare(): void {
    if (this.clip('fanfare', { gain: 0.75 })) return;
    this.play((ctx, out) => {
      const t = ctx.currentTime;
      [392, 494, 587, 784].forEach((f, i) => {
        const st = t + i * 0.13;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const g = env(ctx, st, 0.01, i === 3 ? 1.1 : 0.3, 0.2);
        osc.connect(g).connect(out);
        g.connect(this.echo!);
        osc.start(st);
        osc.stop(st + 1.3);
      });
    });
  }

  private gemArpeggio(): void {
    this.play((ctx, out) => {
      const t = ctx.currentTime;
      // A major-seventh arpeggio up two octaves, with a shimmer on top.
      [1047, 1319, 1568, 1976, 2093, 2637, 3136].forEach((f, i) => {
        const st = t + i * 0.055;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        const g = env(ctx, st, 0.003, 0.6, 0.16);
        osc.connect(g).connect(out);
        g.connect(this.echo!);
        osc.start(st);
        osc.stop(st + 0.7);
      });
      const shimmer = noiseSource(ctx, 1);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7000;
      const g = env(ctx, t + 0.2, 0.2, 0.8, 0.06);
      shimmer.connect(hp).connect(g).connect(out);
      shimmer.start(t + 0.2);
    });
  }

  /** Red Herring's little "wah-wah" dip on top of its chime: you took the bait. */
  private wahWah(): void {
    this.play((ctx, out) => {
      const t = ctx.currentTime + 0.15;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.35);
      const g = env(ctx, t, 0.02, 0.4, 0.1);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /**
   * Plays a loaded clip. Returns false if it isn't loaded, so the caller
   * can fall back to its synthesised version.
   */
  private clip(name: Clip, { gain = 1, rate = 1 }: { gain?: number; rate?: number } = {}): boolean {
    const buffer = this.clips.get(name);
    if (!buffer) return false;
    this.play((ctx, out) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(g).connect(out);
      src.start();
    });
    return true;
  }

  /** Fetches and decodes one file once; resolves null if anything fails. */
  private load(name: string): Promise<AudioBuffer | null> {
    const existing = this.loading.get(name);
    if (existing) return existing;
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);
    const job = fetch(audioUrl(name))
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        this.clips.set(name, buffer);
        return buffer;
      })
      .catch((err) => {
        this.note(`load ${name}`, err);
        this.loading.delete(name); // allow a retry on the next tap
        return null;
      });
    this.loading.set(name, job);
    return job;
  }

  /** Starts both music loops in lockstep; falls back to the drone if either won't load. */
  private async startMusic(): Promise<void> {
    const generation = this.musicGeneration;
    const buffers = await Promise.all(MUSIC.map((m) => this.load(m)));
    const ctx = this.ctx;
    const stillWanted = generation === this.musicGeneration && this.enabled && this.ambientWanted;
    if (!ctx || !this.master || !stillWanted || this.music) return;
    if (buffers.some((b) => !b)) {
      this.startDrone();
      return;
    }
    const bus = ctx.createGain();
    bus.gain.value = 0;
    // Darkens the whole mix as you sink, on top of the crossfade.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 12000;
    filter.connect(bus).connect(this.master);
    const start = ctx.currentTime + 0.05;
    const layers: GainNode[] = [];
    const sources = buffers.map((buffer) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.loopStart = 0;
      src.loopEnd = Math.min(LOOP_SECONDS, buffer!.duration);
      const layer = ctx.createGain();
      layer.gain.value = 0;
      src.connect(layer).connect(filter);
      src.start(start);
      layers.push(layer);
      return src;
    });
    this.music = { bus, filter, layers, sources };
    this.applyMusicDepth(0.01);
    bus.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime, 1.2);
  }

  private stopMusic(): void {
    this.musicGeneration++;
    if (!this.music || !this.ctx) return;
    const { bus, sources } = this.music;
    const t = this.ctx.currentTime;
    bus.gain.setTargetAtTime(0, t, 0.4);
    sources.forEach((s) => s.stop(t + 2));
    this.music = null;
  }

  /** Equal-power crossfade from the shallows loop to the abyss loop with depth. */
  private applyMusicDepth(timeConstant: number): void {
    if (!this.music || !this.ctx) return;
    const t = this.ctx.currentTime;
    const k = Math.min(1, Math.max(0, this.ambientDepth / ABYSS_DEPTH));
    const [shallows, abyss] = this.music.layers;
    shallows.gain.setTargetAtTime(Math.cos((k * Math.PI) / 2), t, timeConstant);
    abyss.gain.setTargetAtTime(Math.sin((k * Math.PI) / 2), t, timeConstant);
    const dark = Math.min(1, this.ambientDepth / 7000);
    this.music.filter.frequency.setTargetAtTime(12000 * Math.pow(0.15, dark), t, timeConstant);
  }

  private play(fn: (ctx: Ctx, out: AudioNode) => void): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    // iOS can drop the context to "interrupted" (a call, another app, a media
    // element). Ask it to come back and schedule anyway: the sound plays as
    // soon as it does, instead of being silently skipped.
    this.wake();
    try {
      fn(this.ctx, this.master);
    } catch (err) {
      this.note('play', err);
    }
  }

  private syncAmbient(): void {
    const want = Boolean(this.enabled && this.ambientWanted && this.ctx);
    if (want && !this.music && !this.drone) {
      void this.startMusic();
    } else if (!want) {
      this.stopMusic();
      this.stopDrone();
    }
  }

  /** The old synthesised drone, only used if the music files can't load. */
  private startDrone(): void {
    if (this.drone || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2;
    filter.frequency.value = 700;
    const oscs = [55, 55.4].map((f) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(filter);
      o.start();
      return o;
    });
    filter.connect(gain).connect(this.master);
    gain.gain.setTargetAtTime(0.05, ctx.currentTime, 1.5);
    this.drone = { gain, filter, oscs };
    this.setDepth(this.ambientDepth);
  }

  private stopDrone(): void {
    if (!this.drone || !this.ctx) return;
    const { gain, oscs } = this.drone;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    oscs.forEach((o) => o.stop(this.ctx!.currentTime + 2));
    this.drone = null;
  }
}

/** Attack/decay envelope gain node. */
function env(ctx: Ctx, start: number, attack: number, decay: number, peak: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  return g;
}

/** A buffer of white noise. */
function noiseSource(ctx: Ctx, seconds: number): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

export const sound = new SoundEngine();
