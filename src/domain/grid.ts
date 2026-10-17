import { getFurnitureDef } from '../data/furnitureCatalog';
import type { ClubState, Facing, FurnitureInstance, GridPoint } from './types';

export const cellKey = (col: number, row: number): string => `${col},${row}`;

/** Quarter turn clockwise: 0 -> 1 -> 2 -> 3 -> 0. */
export const nextFacing = (f: Facing): Facing => ((f + 1) % 4) as Facing;

/**
 * Where a worker stands behind an item (DJ booth, bar): the item's back edge,
 * which faces the wall at facing 0 and turns with it.
 */
export function backSpot(col: number, row: number, w: number, h: number, facing: Facing): { x: number; y: number } {
  switch (facing) {
    case 1:
      return { x: col + 0.05, y: row + h / 2 };
    case 2:
      return { x: col + w / 2, y: row + h - 0.05 };
    case 3:
      return { x: col + w - 0.05, y: row + h / 2 };
    default:
      return { x: col + w / 2, y: row + 0.05 };
  }
}

/** Footprint dimensions after applying facing. */
export function footprintSize(catalogId: string, facing: Facing): { w: number; h: number } {
  const def = getFurnitureDef(catalogId);
  if (!def) return { w: 1, h: 1 };
  return facing % 2 === 1 ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

export function footprintCells(catalogId: string, col: number, row: number, facing: Facing): GridPoint[] {
  const { w, h } = footprintSize(catalogId, facing);
  const cells: GridPoint[] = [];
  for (let dc = 0; dc < w; dc++) for (let dr = 0; dr < h; dr++) cells.push({ col: col + dc, row: row + dr });
  return cells;
}

export function instanceCells(f: FurnitureInstance): GridPoint[] {
  return footprintCells(f.catalogId, f.col, f.row, f.facing);
}

/**
 * The entrance is a door in the back wall (row 0), as in the original screenshots
 * (INFERRED position). It is fixed so room expansion never moves it. The door cell
 * and the cell in front of it stay clear.
 */
export const ENTRANCE: GridPoint = { col: 6, row: 0 };

export function entranceCell(_room?: { cols: number; rows: number }): GridPoint {
  return ENTRANCE;
}

export function reservedCells(_room?: { cols: number; rows: number }): GridPoint[] {
  return [ENTRANCE, { col: ENTRANCE.col, row: ENTRANCE.row + 1 }];
}

export function inBounds(room: { cols: number; rows: number }, p: GridPoint): boolean {
  return p.col >= 0 && p.row >= 0 && p.col < room.cols && p.row < room.rows;
}

/** Map of occupied cell -> furniture id. */
export function occupancy(state: ClubState, ignoreId?: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of state.furniture) {
    if (f.id === ignoreId) continue;
    for (const c of instanceCells(f)) map.set(cellKey(c.col, c.row), f.id);
  }
  return map;
}

export type PlacementCheck = { valid: true } | { valid: false; reason: string };

export function checkPlacement(
  state: ClubState,
  catalogId: string,
  col: number,
  row: number,
  facing: Facing,
  ignoreId?: string,
): PlacementCheck {
  if (!getFurnitureDef(catalogId)) return { valid: false, reason: 'Unknown item' };
  const occ = occupancy(state, ignoreId);
  const reserved = new Set(reservedCells(state.room).map((c) => cellKey(c.col, c.row)));
  for (const c of footprintCells(catalogId, col, row, facing)) {
    if (!inBounds(state.room, c)) return { valid: false, reason: 'Outside the club' };
    const k = cellKey(c.col, c.row);
    if (reserved.has(k)) return { valid: false, reason: 'Keep the entrance clear' };
    if (occ.has(k)) return { valid: false, reason: 'Space is occupied' };
  }
  return { valid: true };
}

/** Cells guests cannot walk through. */
export function blockedCells(state: ClubState): Set<string> {
  const set = new Set<string>();
  for (const f of state.furniture) {
    const def = getFurnitureDef(f.catalogId);
    if (def?.walkable) continue;
    for (const c of instanceCells(f)) set.add(cellKey(c.col, c.row));
  }
  return set;
}

/** Walkable in-bounds cells orthogonally adjacent to a piece of furniture. */
export function adjacentWalkableCells(state: ClubState, f: FurnitureInstance, blocked = blockedCells(state)): GridPoint[] {
  const own = new Set(instanceCells(f).map((c) => cellKey(c.col, c.row)));
  const out = new Map<string, GridPoint>();
  for (const c of instanceCells(f)) {
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = { col: c.col + dc, row: c.row + dr };
      const k = cellKey(n.col, n.row);
      if (own.has(k) || blocked.has(k) || !inBounds(state.room, n)) continue;
      out.set(k, n);
    }
  }
  return [...out.values()];
}

export function furnitureAt(state: ClubState, col: number, row: number): FurnitureInstance | undefined {
  return state.furniture.find((f) => instanceCells(f).some((c) => c.col === col && c.row === row));
}
