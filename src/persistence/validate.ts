import { isValidAppearance } from '../data/appearanceCatalog';
import { getFurnitureDef } from '../data/furnitureCatalog';
import { checkPlacement } from '../domain/grid';
import { GENRES, SCHEMA_VERSION, type ClubState } from '../domain/types';

const isInt = (v: unknown, min = 0): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isTsOrNull = (v: unknown) => v === null || isNum(v);

/** Strict structural validation of a migrated save. Returns the reason on failure. */
export function validateState(d: Record<string, unknown>): { ok: true; state: ClubState } | { ok: false; reason: string } {
  const bad = (reason: string) => ({ ok: false as const, reason });
  if (d.schemaVersion !== SCHEMA_VERSION) return bad('Wrong schema version');
  for (const k of ['cash', 'totalEarned', 'xp', 'popularity', 'nextId'] as const) if (!isInt(d[k])) return bad(`Invalid ${k}`);
  if (!isInt(d.level, 1)) return bad('Invalid level');
  const room = d.room as ClubState['room'];
  if (!room || !isInt(room.cols, 4) || !isInt(room.rows, 4) || room.cols > 64 || room.rows > 64) return bad('Invalid room');
  if (!isValidAppearance(d.appearance)) return bad('Invalid appearance');
  const stock = d.stock as ClubState['stock'];
  if (!stock || !isInt(stock.drinks)) return bad('Invalid stock');
  const stats = d.stats as ClubState['stats'];
  if (!stats || !isInt(stats.drinksSold) || !isInt(stats.guestsVisited) || !isInt(stats.tipsEarned)) return bad('Invalid stats');
  if (typeof d.tutorialDismissed !== 'boolean') return bad('Invalid tutorial flag');
  if (!isNum(d.savedAt)) return bad('Invalid savedAt');
  const dj = d.dj as ClubState['dj'];
  if (!dj || !GENRES.includes(dj.genre) || !isTsOrNull(dj.setStartedAt) || !isTsOrNull(dj.setEndsAt) || !isTsOrNull(dj.lastDropBassAt) || !isTsOrNull(dj.lastDedicateAt))
    return bad('Invalid DJ state');
  if (!Array.isArray(d.furniture)) return bad('Invalid furniture');
  const ids = new Set<string>();
  const partial = { ...(d as unknown as ClubState), furniture: [] as ClubState['furniture'] };
  for (const f of d.furniture as ClubState['furniture']) {
    if (!f || typeof f.id !== 'string' || ids.has(f.id)) return bad('Duplicate or missing furniture id');
    if (!getFurnitureDef(f.catalogId)) return bad(`Unknown furniture ${String(f.catalogId)}`);
    if (!isInt(f.col) || !isInt(f.row) || (f.facing !== 0 && f.facing !== 1)) return bad('Invalid furniture position');
    const check = checkPlacement(partial, f.catalogId, f.col, f.row, f.facing);
    if (!check.valid) return bad(`Furniture ${f.id}: ${check.reason}`);
    ids.add(f.id);
    partial.furniture.push({ id: f.id, catalogId: f.catalogId, col: f.col, row: f.row, facing: f.facing });
  }
  if (!Array.isArray(d.staff)) return bad('Invalid staff');
  const staffIds = new Set<string>();
  for (const s of d.staff as ClubState['staff']) {
    if (!s || typeof s.id !== 'string' || staffIds.has(s.id) || s.role !== 'bartender' || typeof s.name !== 'string') return bad('Invalid staff member');
    if (s.barId !== null && !ids.has(s.barId)) return bad('Staff assigned to missing bar');
    staffIds.add(s.id);
  }
  return { ok: true, state: d as unknown as ClubState };
}
