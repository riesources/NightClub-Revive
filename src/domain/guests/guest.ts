import type { AvatarAppearance } from '../../data/appearanceCatalog';
import type { DrinkOrder } from '../bar';
import type { Genre, GridPoint } from '../types';

/**
 * Guest FSM states (from the blueprint). HAPPY / UNHAPPY are modelled as a mood
 * derived from happiness rather than exclusive states, because a guest can be
 * dancing *and* unhappy. TROUBLEMAKER is deferred until bouncers (P1).
 */
export type GuestState =
  | 'ENTERING'
  | 'CHOOSING_ACTIVITY'
  | 'WALKING_TO_DANCE_FLOOR'
  | 'DANCING'
  | 'THIRSTY'
  | 'QUEUING_FOR_BAR'
  | 'DRINKING'
  | 'SEEKING_SEAT'
  | 'SITTING_OR_SOCIALIZING'
  | 'LEAVING';

export const WALKING_STATES: ReadonlySet<GuestState> = new Set([
  'ENTERING',
  'WALKING_TO_DANCE_FLOOR',
  'THIRSTY',
  'SEEKING_SEAT',
  'LEAVING',
]);

/** Legal transitions; the simulation asserts against this table. */
export const TRANSITIONS: Record<GuestState, readonly GuestState[]> = {
  ENTERING: ['CHOOSING_ACTIVITY', 'LEAVING'],
  CHOOSING_ACTIVITY: ['WALKING_TO_DANCE_FLOOR', 'THIRSTY', 'SEEKING_SEAT', 'LEAVING', 'CHOOSING_ACTIVITY'],
  WALKING_TO_DANCE_FLOOR: ['DANCING', 'CHOOSING_ACTIVITY', 'THIRSTY', 'LEAVING'],
  DANCING: ['CHOOSING_ACTIVITY', 'THIRSTY', 'LEAVING'],
  THIRSTY: ['QUEUING_FOR_BAR', 'CHOOSING_ACTIVITY', 'LEAVING'],
  QUEUING_FOR_BAR: ['DRINKING', 'CHOOSING_ACTIVITY', 'LEAVING'],
  DRINKING: ['CHOOSING_ACTIVITY', 'LEAVING'],
  SEEKING_SEAT: ['SITTING_OR_SOCIALIZING', 'CHOOSING_ACTIVITY', 'THIRSTY', 'LEAVING'],
  SITTING_OR_SOCIALIZING: ['CHOOSING_ACTIVITY', 'THIRSTY', 'LEAVING'],
  LEAVING: ['LEAVING'],
};

export type Mood = 'happy' | 'neutral' | 'unhappy';

export interface Guest {
  id: string;
  /** Fictional generated name (the original showed names on the guest card). */
  name: string;
  /** Total spent this visit: cover + drinks + tips. */
  spent: number;
  tipRate: number;
  guestClass: 'Regular';
  seed: number;
  appearance: AvatarAppearance;
  prefGenre: Genre;
  /** Continuous position in tile units (cell centre = col + 0.5). */
  x: number;
  y: number;
  path: GridPoint[];
  goal: GridPoint | null;
  state: GuestState;
  stateSince: number;
  /** When the current timed activity (dance, drink, sit) ends. */
  activityEndsAt: number;
  happiness: number;
  thirst: number;
  visitEndsAt: number;
  barId: string | null;
  queuedAt: number;
  patienceDeadline: number;
  order: DrinkOrder | null;
  lastProgressAt: number;
  failedGoals: number;
  /** Furniture id the guest is sitting by, for rendering. */
  seatId: string | null;
}

export function moodOf(happiness: number, happyThreshold: number, unhappyThreshold: number): Mood {
  if (happiness >= happyThreshold) return 'happy';
  if (happiness < unhappyThreshold) return 'unhappy';
  return 'neutral';
}

export function guestCell(g: Guest): GridPoint {
  return { col: Math.floor(g.x), row: Math.floor(g.y) };
}
