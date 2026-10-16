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
    level: 0,
    popularity: tuning.startingPopularity,
    room: { cols: tuning.startRoomCols, rows: tuning.startRoomRows },
    furniture: [],
    staff: [],
    appearance: { ...DEFAULT_APPEARANCE },
    dj: { genre: 'club_mix', setStartedAt: null, setEndsAt: null, lastDropBassAt: null, lastDedicateAt: null },
    stock: { drinks: tuning.startingDrinkStock },
    stats: { drinksSold: 0, guestsVisited: 0, tipsEarned: 0 },
    tutorialDismissed: false,
    celebrityWall: {},
    celebrity: null,
    nextId: 1,
    savedAt: now,
  };
  const add = (catalogId: string, col: number, row: number, facing: 0 | 1 = 0): FurnitureInstance => {
    const f = { id: newId(state, 'f'), catalogId, col, row, facing };
    state.furniture.push(f);
    return f;
  };
  // Starter layout modelled on the level-0 club in the tutorial screenshots:
  // DJ booth flanked by speakers in the back-left corner, a small cyan dance
  // floor in front of it, and one bar along the right-hand wall (INFERRED).
  add('speaker_basic', 0, 0);
  add('dj_starter', 1, 0);
  add('speaker_basic', 3, 0);
  for (let c = 0; c <= 3; c++) for (let r = 1; r <= 3; r++) add('floor_neon_blue', c, r);
  const bar = add('bar_basic', 8, 0);
  // PROPOSED: start with one bartender (Gamezebo advises hiring one early; we pre-hire to keep P0 playable).
  state.staff.push({ id: newId(state, 's'), role: 'bartender', name: 'Rico', barId: bar.id, post: null });
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
