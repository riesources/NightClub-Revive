import { getFurnitureDef } from '../data/furnitureCatalog';
import { tuning } from '../data/tuning';
import { clone, newId } from './club';
import { fail, ok, type ClubState, type Result } from './types';

/** PROPOSED placeholder NPC names (replaces the original Facebook-friend hiring). */
const NAMES = ['Rico', 'Jade', 'Marco', 'Tasha', 'Dex', 'Luna', 'Kai', 'Bianca', 'Omar', 'Zoe'];

export function hireBartender(state: ClubState): Result {
  if (state.cash < tuning.bartenderHireCost) return fail('Not enough cash to hire');
  const draft = clone(state);
  draft.cash -= tuning.bartenderHireCost;
  const name = NAMES[draft.staff.length % NAMES.length];
  draft.staff.push({ id: newId(draft, 's'), role: 'bartender', name, barId: null });
  return ok(draft);
}

/**
 * Assign a bartender to a bar. One bartender per bar, one bar per bartender
 * (PROPOSED simplification; Gamezebo notes one worker can cover adjacent bars).
 * Assigning a bartender to a bar someone else works swaps the other one off.
 */
export function assignBartender(state: ClubState, staffId: string, barId: string | null): Result {
  if (!state.staff.some((s) => s.id === staffId)) return fail('Staff member not found');
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
