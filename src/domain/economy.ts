import { getFurnitureDef } from '../data/furnitureCatalog';
import { tuning } from '../data/tuning';
import { clone, newId } from './club';
import { checkPlacement } from './grid';
import { fail, ok, type ClubState, type Facing, type Result } from './types';

export const features = {
  /** PROPOSED: rotation is unverified historically, so it is behind a flag. */
  rotation: true,
};

/**
 * Buy and place a catalogue item in one atomic step. On any failure the input
 * state is returned untouched (callers keep their reference), so cash never moves.
 */
export function buyAndPlace(state: ClubState, catalogId: string, col: number, row: number, facing: Facing = 0): Result {
  const def = getFurnitureDef(catalogId);
  if (!def) return fail('Unknown item');
  if (!Number.isInteger(def.price) || def.price < 0) return fail('Invalid price');
  if (state.level < def.requiredLevel) return fail(`Unlocks at level ${def.requiredLevel}`);
  if (state.cash < def.price) return fail('Not enough cash');
  if (facing === 1 && !features.rotation) return fail('Rotation disabled');
  const check = checkPlacement(state, catalogId, col, row, facing);
  if (!check.valid) return fail(check.reason);
  const draft = clone(state);
  draft.cash -= def.price;
  draft.furniture.push({ id: newId(draft, 'f'), catalogId, col, row, facing });
  return ok(draft);
}

export function moveFurniture(state: ClubState, id: string, col: number, row: number, facing?: Facing): Result {
  const f = state.furniture.find((x) => x.id === id);
  if (!f) return fail('Item not found');
  const nextFacing = facing ?? f.facing;
  if (nextFacing !== f.facing && !features.rotation) return fail('Rotation disabled');
  const check = checkPlacement(state, f.catalogId, col, row, nextFacing, id);
  if (!check.valid) return fail(check.reason);
  const draft = clone(state);
  const target = draft.furniture.find((x) => x.id === id)!;
  target.col = col;
  target.row = row;
  target.facing = nextFacing;
  return ok(draft);
}

export function sellRefund(catalogId: string): number {
  const def = getFurnitureDef(catalogId);
  return def ? Math.floor(def.price * tuning.sellRefundRatio) : 0;
}

/** Sell an item: removes it once, refunds once, and unassigns any bartender working it. */
export function sellFurniture(state: ClubState, id: string): Result {
  const f = state.furniture.find((x) => x.id === id);
  if (!f) return fail('Item not found');
  const draft = clone(state);
  draft.furniture = draft.furniture.filter((x) => x.id !== id);
  draft.cash += sellRefund(f.catalogId);
  for (const s of draft.staff) if (s.barId === id) s.barId = null;
  return ok(draft);
}
