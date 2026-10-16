import { getFurnitureDef } from '../data/furnitureCatalog';
import { WORKER_SLOT_LEVELS } from '../data/progression';
import { tuning } from '../data/tuning';
import { clone, newId } from './club';
import { entranceCell, inBounds } from './grid';
import { fail, ok, type ClubState, type GridPoint, type Result } from './types';

/** PROPOSED placeholder NPC names (replaces the original Facebook-friend hiring). */
const NAMES = ['Rico', 'Jade', 'Marco', 'Tasha', 'Dex', 'Luna', 'Kai', 'Bianca', 'Omar', 'Zoe'];

/** Worker slots open at the current level (CONFIRMED pattern: 2, then levels 9/13/17/21). */
export function workerSlots(level: number): number {
  return WORKER_SLOT_LEVELS.filter((l) => level >= l).length;
}

export function hireBartender(state: ClubState): Result {
  if (state.staff.length >= workerSlots(state.level)) return fail('No free worker slot - more unlock as you level up');
  if (state.cash < tuning.bartenderHireCost) return fail('Not enough cash to hire');
  const draft = clone(state);
  draft.cash -= tuning.bartenderHireCost;
  const name = NAMES[draft.staff.length % NAMES.length];
  draft.staff.push({ id: newId(draft, 's'), role: 'bartender', name, barId: null, post: null });
  return ok(draft);
}

/**
 * Assign a bartender to a bar. One bartender per bar, one bar per bartender
 * (PROPOSED simplification; Gamezebo notes one worker can cover adjacent bars).
 * Assigning a bartender to a bar someone else works swaps the other one off.
 */
export function assignBartender(state: ClubState, staffId: string, barId: string | null): Result {
  const member = state.staff.find((s) => s.id === staffId);
  if (!member) return fail('Staff member not found');
  if (barId !== null && member.role !== 'bartender') return fail('Only bartenders work a bar');
  if (barId !== null) {
    const bar = state.furniture.find((f) => f.id === barId);
    if (!bar || getFurnitureDef(bar.catalogId)?.kind !== 'bar') return fail('That is not a bar');
  }
  const draft = clone(state);
  for (const s of draft.staff) {
    if (s.id === staffId) s.barId = barId;
    else if (barId !== null && s.barId === barId) s.barId = null;
  }
  return ok(draft);
}

export function bartenderForBar(state: ClubState, barId: string) {
  return state.staff.find((s) => s.role === 'bartender' && s.barId === barId);
}

/**
 * Switch a worker between Bar Tender and Bouncer (CONFIRMED: the Workers panel
 * offers "Switch to Bouncer" / "Switch to Bartender"). A new bouncer starts
 * posted just inside the door (PROPOSED default).
 */
export function switchRole(state: ClubState, staffId: string): Result {
  const s = state.staff.find((x) => x.id === staffId);
  if (!s) return fail('Staff member not found');
  const draft = clone(state);
  const m = draft.staff.find((x) => x.id === staffId)!;
  if (m.role === 'bartender') {
    const e = entranceCell(draft.room);
    m.role = 'bouncer';
    m.barId = null;
    m.post = { col: e.col, row: e.row + 2 };
  } else {
    m.role = 'bartender';
    m.post = null;
  }
  return ok(draft);
}

/** Move a bouncer's post to any tile inside the club. */
export function setBouncerPost(state: ClubState, staffId: string, post: GridPoint): Result {
  const s = state.staff.find((x) => x.id === staffId);
  if (!s) return fail('Staff member not found');
  if (s.role !== 'bouncer') return fail('Only bouncers have a post');
  if (!inBounds(state.room, post)) return fail('Outside the club');
  const draft = clone(state);
  draft.staff.find((x) => x.id === staffId)!.post = { col: post.col, row: post.row };
  return ok(draft);
}

/** Chebyshev distance, so a bouncer's area is a square of tiles around the post. */
export function inBouncerArea(post: GridPoint, x: number, y: number, radius: number): boolean {
  return Math.max(Math.abs(Math.floor(x) - post.col), Math.abs(Math.floor(y) - post.row)) <= radius;
}
