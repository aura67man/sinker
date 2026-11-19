/**
 * Every sound in the game, synthesised live with the Web Audio API.
 * No audio files, nothing to license.
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is
 * created lazily by `unlock()`, which the app calls from click handlers.
 * Sound is off by default (people play this in class).
 */
import type { Outcome } from '../logic/tiers';

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

  /** Create/resume the audio context. Call from a user gesture. */
  unlock(): void {
    if (!this.enabled) return;
    try {
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
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      this.syncAmbient();
    } catch {
      // No audio available: stay silent.
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
    if (!this.drone || !this.ctx) return;
    const t = this.ctx.currentTime;
    const k = Math.min(1, depth / 7000);
    this.drone.filter.frequency.setTargetAtTime(700 - 560 * k, t, 1.2);
    this.drone.oscs.forEach((o, i) => o.frequency.setTargetAtTime((i ? 55.4 : 55) * (1 - 0.35 * k), t, 1.5));
  }

  // ── Effects ───────────────────────────────────────────────────────────────

  /** Soft sonar ping when a prompt appears. */
  ping(): void {
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
    if (outcome === 'gem') return this.gemArpeggio();
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

  // ── Internals ─────────────────────────────────────────────────────────────

  private play(fn: (ctx: Ctx, out: AudioNode) => void): void {
    if (!this.enabled || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    try {
      fn(this.ctx, this.master);
    } catch {
      // A failed sound is never worth a crash.
    }
  }

  private syncAmbient(): void {
    const want = this.enabled && this.ambientWanted && this.ctx;
    if (want && !this.drone && this.ctx && this.master) {
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
    } else if (!want && this.drone && this.ctx) {
      const { gain, oscs } = this.drone;
      gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      oscs.forEach((o) => o.stop(this.ctx!.currentTime + 2));
      this.drone = null;
    }
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
