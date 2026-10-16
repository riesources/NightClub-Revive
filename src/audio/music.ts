import type { Genre } from '../domain/types';

/**
 * ORIGINAL procedural music. The 2010 game streamed licensed commercial tracks
 * (e.g. its now-playing box credited real artists), which cannot be reused.
 * Instead each genre gets a synthesized loop in the right style. Nothing here
 * samples or imitates a specific recording.
 */
interface Style {
  bpm: number;
  /** 16-step patterns: 1 = hit. */
  kick: number[];
  snare: number[];
  hat: number[];
  /** Bass notes per step as semitones from root (null = rest). */
  bass: (number | null)[];
  /** Chord roots (semitones) per bar, 4 bars. */
  chords: number[];
  root: number;
  lead: 'arp' | 'stab' | 'pluck' | 'none';
  swing: number;
}

const X = null;
const STYLES: Record<Genre, Style> = {
  club_mix: {
    bpm: 124, root: 45, swing: 0, lead: 'stab',
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
    bass: [0, X, 0, X, X, 0, X, 12, 0, X, 0, X, X, 0, X, 10],
    chords: [0, 5, 3, 7],
  },
  hiphop: {
    bpm: 90, root: 41, swing: 0.12, lead: 'pluck',
    kick: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0],
    bass: [0, X, X, X, X, X, X, 0, X, X, 3, X, X, X, X, X],
    chords: [0, 0, 8, 7],
  },
  electronic: {
    bpm: 128, root: 43, swing: 0, lead: 'arp',
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hat: [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
    bass: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0],
    chords: [0, 3, 8, 7],
  },
  pop: {
    bpm: 112, root: 48, swing: 0, lead: 'stab',
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    bass: [0, X, X, 0, X, X, 0, X, 7, X, X, 7, X, X, 5, X],
    chords: [0, 7, 9, 5],
  },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private genre: Genre | null = null;
  private step = 0;
  private nextTime = 0;
  private noise: AudioBuffer | null = null;
  muted = false;

  get playing(): Genre | null {
    return this.genre;
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.32;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 0.5;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return this.ctx;
  }

  /** Browsers only allow audio after a user gesture; call from a click handler. */
  unlock(): void {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.32, this.ctx.currentTime, 0.05);
  }

  play(genre: Genre): void {
    if (this.genre === genre) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.genre = genre;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.05;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop(): void {
    this.genre = null;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.genre) return;
    const st = STYLES[this.genre];
    const stepDur = 60 / st.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const i = this.step % 16;
      const bar = Math.floor(this.step / 16) % 4;
      const t = this.nextTime + (i % 2 === 1 ? st.swing * stepDur : 0);
      const chordRoot = st.root + st.chords[bar];
      if (st.kick[i]) this.kick(t);
      if (st.snare[i]) this.snare(t);
      if (st.hat[i]) this.hat(t, i % 4 === 2 ? 0.5 : 0.28);
      const b = st.bass[i];
      if (b !== null) this.bass(t, midi(chordRoot - 12 + b), stepDur * 1.6);
      if (st.lead === 'stab' && (i === 2 || i === 6 || i === 10 || i === 14)) this.chord(t, chordRoot + 12, stepDur * 1.5);
      if (st.lead === 'arp') this.pluck(t, midi(chordRoot + 12 + [0, 7, 12, 3, 7, 15, 12, 7][i % 8]), stepDur * 0.9, 0.06);
      if (st.lead === 'pluck' && (i === 0 || i === 3 || i === 8 || i === 11)) this.chord(t, chordRoot + 12, stepDur * 3, 'triangle', 0.05);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private env(t: number, peak: number, decay: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(this.master!);
    return g;
  }

  private kick(t: number): void {
    const o = this.ctx!.createOscillator();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    o.connect(this.env(t, 0.9, 0.3));
    o.start(t);
    o.stop(t + 0.32);
  }

  private snare(t: number): void {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx!.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    src.connect(f).connect(this.env(t, 0.35, 0.18));
    src.start(t);
    src.stop(t + 0.2);
  }

  private hat(t: number, level: number): void {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx!.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    src.connect(f).connect(this.env(t, level * 0.35, 0.05));
    src.start(t);
    src.stop(t + 0.06);
  }

  private bass(t: number, freq: number, dur: number): void {
    const o = this.ctx!.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const f = this.ctx!.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(600, t);
    f.frequency.exponentialRampToValueAtTime(180, t + dur);
    o.connect(f).connect(this.env(t, 0.28, dur));
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private pluck(t: number, freq: number, dur: number, level: number, type: OscillatorType = 'square'): void {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const f = this.ctx!.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3200, t);
    f.frequency.exponentialRampToValueAtTime(500, t + dur);
    o.connect(f).connect(this.env(t, level, dur));
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private chord(t: number, root: number, dur: number, type: OscillatorType = 'sawtooth', level = 0.045): void {
    for (const iv of [0, 3, 7]) this.pluck(t, midi(root + iv), dur, level, type);
  }
}

export const MIX_LABELS: Record<Genre, string> = {
  club_mix: 'Club Mix',
  hiphop: 'Hip-Hop Mix',
  electronic: 'Electronic Mix',
  pop: 'Pop Mix',
};
