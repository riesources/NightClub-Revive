import type { AvatarAppearance } from '../data/appearanceCatalog';

export const SCHEMA_VERSION = 7;

/** CONFIRMED genres: GameYum guide lists club mix, hip hop, electronica, pop. */
export const GENRES = ['club_mix', 'hiphop', 'electronic', 'pop'] as const;
export type Genre = (typeof GENRES)[number];
export const GENRE_LABELS: Record<Genre, string> = {
  club_mix: 'Club Mix',
  hiphop: 'Hip-Hop',
  electronic: 'Electronic',
  pop: 'Pop',
};

export interface GridPoint {
  col: number;
  row: number;
}

/** 0 = default orientation, 1 = mirrored (footprint w/h swapped). PROPOSED, feature-flagged. */
export type Facing = 0 | 1;

export interface FurnitureInstance {
  id: string;
  catalogId: string;
  col: number;
  row: number;
  facing: Facing;
}

export interface StaffMember {
  id: string;
  /** CONFIRMED roles (Workers panel): Bar Tender / Bouncer, switchable. */
  role: 'bartender' | 'bouncer';
  name: string;
  /** Furniture id of the bar this bartender works, or null if unassigned. */
  barId: string | null;
  /** Bouncers only: the tile they stand on; they cover an area around it. */
  post: GridPoint | null;
  /** Bartenders only: 'tricks' = bigger tips, 'speed' = faster service (CONFIRMED options). */
  mode: 'speed' | 'tricks';
}

export interface DJState {
  genre: Genre;
  /** Absolute epoch-ms timestamps so timers survive tab suspension and reloads. */
  setStartedAt: number | null;
  setEndsAt: number | null;
  lastDropBassAt: number | null;
  lastDedicateAt: number | null;
}

/** Persisted club state. Transient simulation data (guests, paths, queues) is never saved. */
export interface ClubState {
  schemaVersion: number;
  cash: number;
  totalEarned: number;
  xp: number;
  level: number;
  popularity: number;
  room: { cols: number; rows: number };
  furniture: FurnitureInstance[];
  staff: StaffMember[];
  appearance: AvatarAppearance;
  dj: DJState;
  stock: { drinks: number };
  stats: { drinksSold: number; guestsVisited: number; tipsEarned: number };
  tutorialDismissed: boolean;
  /** Celebrity id -> number of completed visits (the celebrity wall). */
  celebrityWall: Record<string, number>;
  /** The booked celebrity, if any. Absolute timestamps so reloads stay consistent. */
  celebrity: { id: string; arrivesAt: number; leavesAt: number } | null;
  /** The running party, if any (absolute timestamps; guest count persists). */
  party: { id: string; startsAt: number; endsAt: number; guests: number } | null;
  /** Party id -> number of successful parties. */
  partyHistory: Record<string, number>;
  /** Shown top-right like the original's "Aaron's Club" (S10). */
  clubName: string;
  /** Celebrities marked with "Wish" on their card. */
  celebWishes: string[];
  /** Monotonic counter for stable ids. */
  nextId: number;
  savedAt: number;
}

export type Result<T = ClubState> = { ok: true; state: T } | { ok: false; reason: string };

export const ok = <T,>(state: T): Result<T> => ({ ok: true, state });
export const fail = <T = ClubState,>(reason: string): Result<T> => ({ ok: false, reason });
