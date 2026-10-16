import { CELEB_ARRIVAL_DELAY_MS, getCelebrity } from '../data/celebrities';
import { adjustPopularity, clone } from './club';
import { fail, ok, type ClubState, type Result } from './types';

/** Book a celebrity: one at a time, level-gated, paid up front. */
export function bookCelebrity(state: ClubState, celebId: string, now: number): Result {
  const c = getCelebrity(celebId);
  if (!c) return fail('Unknown celebrity');
  if (state.celebrity) return fail('A celebrity is already booked');
  if (state.level < c.requiredLevel) return fail(`Unlocks at level ${c.requiredLevel}`);
  if (state.cash < c.cost) return fail('Not enough cash');
  const draft = clone(state);
  draft.cash -= c.cost;
  const arrivesAt = now + CELEB_ARRIVAL_DELAY_MS;
  draft.celebrity = { id: c.id, arrivesAt, leavesAt: arrivesAt + c.visitMs };
  return ok(draft);
}

export type CelebPhase = 'none' | 'coming' | 'here' | 'done';

export function celebrityPhase(state: ClubState, now: number): CelebPhase {
  const b = state.celebrity;
  if (!b) return 'none';
  if (now < b.arrivesAt) return 'coming';
  if (now < b.leavesAt) return 'here';
  return 'done';
}

/**
 * Close a finished visit: adds it to the wall and grants the popularity bonus.
 * Idempotent - it clears the booking, so it can never pay out twice (including
 * after a reload past `leavesAt`).
 */
export function finishCelebrityVisit(state: ClubState, now: number): Result {
  if (celebrityPhase(state, now) !== 'done') return fail('No visit to finish');
  const c = getCelebrity(state.celebrity!.id)!;
  const draft = clone(state);
  draft.celebrityWall[c.id] = (draft.celebrityWall[c.id] ?? 0) + 1;
  adjustPopularity(draft, c.popularityBonus);
  draft.celebrity = null;
  return ok(draft);
}
