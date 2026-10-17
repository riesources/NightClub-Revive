import type { Genre } from '../domain/types';

/**
 * ORIGINAL procedural music. The 2010 game streamed licensed commercial tracks
 * (e.g. its now-playing box credited real artists), which cannot be reused.
 * Instead every mix has a short playlist of synthesized tracks in that style,
 * played back to back like a DJ set. Nothing here samples or imitates a
 * specific recording; track names are invented.
 */
interface Track {
  name: string;
  bpm: number;
  /** 16-step patterns: 1 = hit. */
  kick: number[];
  snare: number[];
  hat: number[];
  /** Bass notes per step as semitones from the chord root (null = rest). */
  bass: (number | null)[];
  /** Chord roots (semitones) per bar, 4 bars. */
  chords: number[];
  /** MIDI note of the key. */
  root: number;
  lead: 'arp' | 'stab' | 'pluck' | 'piano' | 'bell' | 'none';
  /** Minor (3) or major (4) third in chords. */
  third?: 3 | 4;
  swing: number;
  /** Extra percussion: rim/clave hits. */
  perc?: number[];
}

const X = null;
const FOUR = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const BACKBEAT = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
const OFFHAT = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];

export const PLAYLISTS: Record<Genre, Track[]> = {
  club_mix: [
    { name: 'Velvet Rope', bpm: 124, root: 45, swing: 0, lead: 'stab', kick: FOUR, snare: BACKBEAT, hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1], bass: [0, X, 0, X, X, 0, X, 12, 0, X, 0, X, X, 0, X, 10], chords: [0, 5, 3, 7] },
    { name: 'Neon Sign', bpm: 126, root: 47, swing: 0, lead: 'arp', third: 4, kick: FOUR, snare: BACKBEAT, hat: OFFHAT, bass: [0, X, 12, X, 0, X, 12, X, 0, X, 12, X, 0, X, 12, 7], chords: [0, 9, 5, 7] },
    { name: 'Last Call Groove', bpm: 122, root: 43, swing: 0.05, lead: 'piano', kick: FOUR, snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0], hat: [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1], bass: [0, X, X, 0, X, X, 7, X, 0, X, X, 0, X, 10, X, X], chords: [0, 3, 5, 3] },
  ],
  hiphop: [
    { name: 'Boom Box Sunday', bpm: 90, root: 41, swing: 0.12, lead: 'pluck', kick: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0], snare: BACKBEAT, hat: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0], bass: [0, X, X, X, X, X, X, 0, X, X, 3, X, X, X, X, X], chords: [0, 0, 8, 7] },
    { name: 'Corner Store Cipher', bpm: 86, root: 38, swing: 0.16, lead: 'piano', kick: [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], bass: [0, X, X, 0, X, X, X, X, 5, X, 3, X, X, X, X, X], chords: [0, 5, 3, 5] },
    { name: 'Rooftop Bounce', bpm: 95, root: 43, swing: 0.08, lead: 'bell', kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0], snare: BACKBEAT, hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1], bass: [0, X, X, X, X, X, 0, X, X, 0, X, X, X, X, X, X], chords: [0, 8, 3, 10] },
  ],
  electronic: [
    { name: 'Laser Lane', bpm: 128, root: 43, swing: 0, lead: 'arp', kick: FOUR, snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], hat: [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1], bass: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0], chords: [0, 3, 8, 7] },
    { name: 'Circuit Breaker', bpm: 132, root: 45, swing: 0, lead: 'stab', kick: FOUR, snare: BACKBEAT, hat: OFFHAT, bass: [0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 3, 15], chords: [0, 0, 5, 3] },
    { name: 'Afterglow Drive', bpm: 124, root: 40, swing: 0, lead: 'bell', kick: FOUR, snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0], hat: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1], bass: [0, X, 0, 0, X, 0, 0, X, 0, X, 0, 0, X, 0, 7, X], chords: [0, 8, 10, 7] },
  ],
  pop: [
    { name: 'Glitter Heart', bpm: 112, root: 48, swing: 0, lead: 'stab', third: 4, kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], snare: BACKBEAT, hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], bass: [0, X, X, 0, X, X, 0, X, 7, X, X, 7, X, X, 5, X], chords: [0, 7, 9, 5] },
    { name: 'Summer Text', bpm: 118, root: 50, swing: 0, lead: 'piano', third: 4, kick: FOUR, snare: BACKBEAT, hat: [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0], bass: [0, X, 0, X, 0, X, 0, X, 5, X, 5, X, 7, X, 7, X], chords: [0, 5, 9, 7] },
    { name: 'Polaroid Kiss', bpm: 104, root: 45, swing: 0.04, lead: 'bell', third: 4, kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0], snare: BACKBEAT, hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], bass: [0, X, X, X, 0, X, X, X, 9, X, X, X, 5, X, 7, X], chords: [0, 9, 5, 7] },
  ],
  house: [
    { name: 'Warehouse Sunrise', bpm: 122, root: 45, swing: 0.06, lead: 'piano', kick: FOUR, snare: BACKBEAT, hat: OFFHAT, bass: [0, X, X, 0, X, X, 0, X, X, 0, X, X, 0, X, 7, X], chords: [0, 5, 7, 3] },
    { name: 'Disco Ball Diary', bpm: 120, root: 48, swing: 0.08, lead: 'stab', third: 4, kick: FOUR, snare: BACKBEAT, hat: [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1], bass: [0, 12, X, 0, 12, X, 0, 12, X, 0, 12, X, 5, 7, X, X], chords: [0, 9, 2, 7] },
    { name: 'Deep Pocket', bpm: 124, root: 41, swing: 0.1, lead: 'bell', kick: FOUR, snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: OFFHAT, bass: [0, X, X, X, X, X, 0, X, X, 3, X, X, X, X, 5, X], chords: [0, 0, 3, 5], perc: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0] },
  ],
  latin: [
    { name: 'Calle Caliente', bpm: 96, root: 45, swing: 0, lead: 'pluck', kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0], hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], bass: [0, X, X, 0, X, X, 0, X, 0, X, X, 0, X, X, 7, X], chords: [0, 8, 3, 10] },
    { name: 'Salsa Neon', bpm: 104, root: 48, swing: 0, lead: 'piano', third: 4, kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], bass: [X, X, X, 0, X, X, 7, X, X, X, X, 0, X, X, 7, X], chords: [0, 5, 7, 0], perc: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0] },
    { name: 'Midnight Cumbia', bpm: 92, root: 43, swing: 0.05, lead: 'bell', kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], bass: [0, X, X, X, 7, X, X, X, 0, X, X, X, 7, X, X, X], chords: [0, 0, 7, 7], perc: [0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1] },
  ],
};

/** Each track plays this many bars before the set moves on to the next one. */
export const BARS_PER_TRACK = 32;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private genre: Genre | null = null;
  private trackIndex = 0;
  private step = 0;
  private nextTime = 0;
  private noise: AudioBuffer | null = null;
  private listeners = new Set<() => void>();
  muted = false;

  get playing(): Genre | null {
    return this.genre;
  }

  /** The track currently playing in the set, if any. */
  get track(): { name: string; index: number; count: number } | null {
    if (!this.genre) return null;
    const list = PLAYLISTS[this.genre];
    return { name: list[this.trackIndex].name, index: this.trackIndex, count: list.length };
  }

  onTrackChange(l: () => void): void {
    this.listeners.add(l);
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
    this.trackIndex = 0;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.05;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 25);
    this.notify();
  }

  /** Jump to the next track in the current mix. */
  skip(): void {
    if (!this.genre) return;
    this.trackIndex = (this.trackIndex + 1) % PLAYLISTS[this.genre].length;
    this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.05;
    this.notify();
  }

  stop(): void {
    this.genre = null;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.notify();
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.genre) return;
    const st = PLAYLISTS[this.genre][this.trackIndex];
    const stepDur = 60 / st.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const i = this.step % 16;
      const bar = Math.floor(this.step / 16) % 4;
      const t = this.nextTime + (i % 2 === 1 ? st.swing * stepDur : 0);
      const chordRoot = st.root + st.chords[bar];
      const third = st.third ?? 3;
      // a one-bar breakdown before each track change: drop the kick
      const breakdown = Math.floor(this.step / 16) % BARS_PER_TRACK === BARS_PER_TRACK - 1;
      if (st.kick[i] && !breakdown) this.kick(t);
      if (st.snare[i]) this.snare(t);
      if (st.hat[i]) this.hat(t, i % 4 === 2 ? 0.5 : 0.28);
      if (st.perc?.[i]) this.rim(t);
      const b = st.bass[i];
      if (b !== null && !breakdown) this.bass(t, midi(chordRoot - 12 + b), stepDur * 1.6);
      if (st.lead === 'stab' && (i === 2 || i === 6 || i === 10 || i === 14)) this.chord(t, chordRoot + 12, third, stepDur * 1.5);
      if (st.lead === 'arp') this.pluck(t, midi(chordRoot + 12 + [0, 7, 12, third, 7, 12 + third, 12, 7][i % 8]), stepDur * 0.9, 0.06);
      if (st.lead === 'pluck' && (i === 0 || i === 3 || i === 8 || i === 11)) this.chord(t, chordRoot + 12, third, stepDur * 3, 'triangle', 0.05);
      if (st.lead === 'piano' && (i === 0 || i === 3 || i === 6 || i === 10 || i === 12)) this.chord(t, chordRoot + 12, third, stepDur * 2.5, 'triangle', 0.06);
      if (st.lead === 'bell' && i % 4 === 0) this.pluck(t, midi(chordRoot + 24 + [0, 7, third, 12][(i / 4) % 4]), stepDur * 3, 0.05, 'sine');
      this.nextTime += stepDur;
      this.step++;
      if (this.step >= BARS_PER_TRACK * 16) {
        // the set moves on to the next track in the mix
        this.step = 0;
        this.trackIndex = (this.trackIndex + 1) % PLAYLISTS[this.genre].length;
        this.notify();
        return;
      }
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

  /** Short wooden click (rim / clave) for the House and Latin grooves. */
  private rim(t: number): void {
    const o = this.ctx!.createOscillator();
    o.type = 'square';
    o.frequency.value = 1700;
    const f = this.ctx!.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2200;
    o.connect(f).connect(this.env(t, 0.12, 0.04));
    o.start(t);
    o.stop(t + 0.05);
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

  private chord(t: number, root: number, third: number, dur: number, type: OscillatorType = 'sawtooth', level = 0.045): void {
    for (const iv of [0, third, 7]) this.pluck(t, midi(root + iv), dur, level, type);
  }
}

export const MIX_LABELS: Record<Genre, string> = {
  club_mix: 'Club Mix',
  hiphop: 'Hip-Hop Mix',
  electronic: 'Electronic Mix',
  pop: 'Pop Mix',
  house: 'House Mix',
  latin: 'Latin Mix',
};
