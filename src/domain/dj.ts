import { getFurnitureDef } from '../data/furnitureCatalog';
import { tuning } from '../data/tuning';
import { clone } from './club';
import { fail, ok, type ClubState, type Genre, type Result, GENRES } from './types';

/** Set length from the best DJ booth placed (CONFIRMED default 15 min; longer booths INFERRED). */
export function djSetLength(state: ClubState): number | null {
  let best: number | null = null;
  for (const f of state.furniture) {
    const def = getFurnitureDef(f.catalogId);
    if (def?.kind === 'dj') best = Math.max(best ?? 0, def.djSetMs ?? tuning.defaultDjSetMs);
  }
  return best;
}

export function isPlaying(state: ClubState, now: number): boolean {
  return state.dj.setEndsAt !== null && now < state.dj.setEndsAt;
}

export function timeRemaining(state: ClubState, now: number): number {
  return state.dj.setEndsAt === null ? 0 : Math.max(0, state.dj.setEndsAt - now);
}

/** Start (or restart once finished) a set. Timestamps make it immune to frame-rate and tab suspension. */
export function startSet(state: ClubState, genre: Genre, now: number): Result {
  if (!GENRES.includes(genre)) return fail('Unknown genre');
  const len = djSetLength(state);
  if (len === null) return fail('Place a DJ booth first');
  if (isPlaying(state, now)) return fail('A set is already playing');
  const draft = clone(state);
  draft.dj.genre = genre;
  draft.dj.setStartedAt = now;
  draft.dj.setEndsAt = now + len;
  return ok(draft);
}

/** Changing genre mid-set is allowed and does not reset the timer (PROPOSED). */
export function changeGenre(state: ClubState, genre: Genre): Result {
  if (!GENRES.includes(genre)) return fail('Unknown genre');
  const draft = clone(state);
  draft.dj.genre = genre;
  return ok(draft);
}

export function cooldownLeft(last: number | null, cooldown: number, now: number): number {
  return last === null ? 0 : Math.max(0, last + cooldown - now);
}

/** "Drop the Bass" (name: GameYum; effect "guests go to the bar": Gamezebo). Cooldown PROPOSED. */
export function dropTheBass(state: ClubState, now: number): Result {
  if (!isPlaying(state, now)) return fail('Start a set first');
  if (cooldownLeft(state.dj.lastDropBassAt, tuning.dropBassCooldownMs, now) > 0) return fail('Drop the Bass is cooling down');
  const draft = clone(state);
  draft.dj.lastDropBassAt = now;
  return ok(draft);
}

/** "Dedicate Song" (name: GameYum; targets any guest to raise happiness: Gamezebo). Cooldown PROPOSED. */
export function dedicateSong(state: ClubState, now: number): Result {
  if (!isPlaying(state, now)) return fail('Start a set first');
  if (cooldownLeft(state.dj.lastDedicateAt, tuning.dedicateCooldownMs, now) > 0) return fail('Dedicate Song is cooling down');
  const draft = clone(state);
  draft.dj.lastDedicateAt = now;
  return ok(draft);
}
