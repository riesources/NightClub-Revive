import { DEFAULT_APPEARANCE } from '../data/appearanceCatalog';
import { getFurnitureDef } from '../data/furnitureCatalog';
import { tuning } from '../data/tuning';
import { SCHEMA_VERSION, type ClubState, type FurnitureInstance } from './types';

export function clone(state: ClubState): ClubState {
  return structuredClone(state);
}

export function newId(draft: ClubState, prefix: string): string {
  const id = `${prefix}${draft.nextId}`;
  draft.nextId += 1;
  return id;
}

/** A fresh club with a small PROPOSED starter layout so the loop is playable immediately. */
export function createNewClub(now = Date.now()): ClubState {
  const state: ClubState = {
    schemaVersion: SCHEMA_VERSION,
    cash: tuning.startingCash,
    totalEarned: 0,
    xp: 0,
    level: 1,
    popularity: 0,
    room: { cols: tuning.startRoomCols, rows: tuning.startRoomRows },
    furniture: [],
    staff: [],
    appearance: { ...DEFAULT_APPEARANCE },
    dj: { genre: 'club_mix', setStartedAt: null, setEndsAt: null, lastDropBassAt: null, lastDedicateAt: null },
    stock: { drinks: tuning.startingDrinkStock },
    stats: { drinksSold: 0, guestsVisited: 0, tipsEarned: 0 },
    tutorialDismissed: false,
    nextId: 1,
    savedAt: now,
  };
  const add = (catalogId: string, col: number, row: number, facing: 0 | 1 = 0): FurnitureInstance => {
    const f = { id: newId(state, 'f'), catalogId, col, row, facing };
    state.furniture.push(f);
    return f;
  };
  add('dj_starter', 5, 0);
  add('speaker_basic', 3, 0);
  add('speaker_basic', 8, 0);
  for (let c = 4; c <= 7; c++) for (let r = 2; r <= 5; r++) add((c + r) % 2 ? 'floor_neon_purple' : 'floor_neon_blue', c, r);
  const bar = add('bar_basic', 0, 3, 1);
  add('stool_basic', 0, 7);
  add('stool_basic', 0, 8);
  add('sofa_red', 9, 7);
  add('plant_palm', 11, 0);
  add('plant_palm', 0, 0);
  // PROPOSED: start with one bartender (Gamezebo advises hiring one early; we pre-hire to keep P0 playable).
  state.staff.push({ id: newId(state, 's'), role: 'bartender', name: 'Rico', barId: bar.id });
  return state;
}

/** Luxury is derived from placed furniture (PROPOSED formula: sum of item luxury). */
export function computeLuxury(state: ClubState): number {
  return state.furniture.reduce((sum, f) => sum + (getFurnitureDef(f.catalogId)?.luxury ?? 0), 0);
}

/** Guest capacity: PROPOSED, scales with room area and capped for performance. */
export function guestCapacity(state: ClubState): number {
  return Math.min(tuning.maxGuests, Math.floor((state.room.cols * state.room.rows) / 4));
}

export function adjustPopularity(draft: ClubState, delta: number): void {
  draft.popularity = Math.max(0, Math.min(tuning.popularityMax, draft.popularity + delta));
}
