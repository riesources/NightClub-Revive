import { isValidAppearance } from '../data/appearanceCatalog';
import { getCelebrity } from '../data/celebrities';
import { getParty } from '../data/parties';
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
  if (!isInt(d.level, 0)) return bad('Invalid level');
  const room = d.room as ClubState['room'];
  if (!room || !isInt(room.cols, 4) || !isInt(room.rows, 4) || room.cols > 64 || room.rows > 64) return bad('Invalid room');
  if (!isValidAppearance(d.appearance)) return bad('Invalid appearance');
  const stock = d.stock as ClubState['stock'];
  if (!stock || !isInt(stock.drinks)) return bad('Invalid stock');
  const stats = d.stats as ClubState['stats'];
  if (!stats || !isInt(stats.drinksSold) || !isInt(stats.guestsVisited) || !isInt(stats.tipsEarned)) return bad('Invalid stats');
  if (typeof d.tutorialDismissed !== 'boolean') return bad('Invalid tutorial flag');
  const wall = d.celebrityWall as Record<string, unknown>;
  if (!wall || typeof wall !== 'object' || Array.isArray(wall)) return bad('Invalid celebrity wall');
  for (const [k, v] of Object.entries(wall)) if (!getCelebrity(k) || !isInt(v, 1)) return bad('Invalid celebrity wall entry');
  const celeb = d.celebrity as ClubState['celebrity'];
  if (celeb !== null && (!celeb || !getCelebrity(celeb.id) || !isNum(celeb.arrivesAt) || !isNum(celeb.leavesAt) || celeb.leavesAt < celeb.arrivesAt)) return bad('Invalid celebrity booking');
  const party = d.party as ClubState['party'];
  if (party !== null && (!party || !getParty(party.id) || !isNum(party.startsAt) || !isNum(party.endsAt) || party.endsAt < party.startsAt || !isInt(party.guests))) return bad('Invalid party');
  const hist = d.partyHistory as Record<string, unknown>;
  if (!hist || typeof hist !== 'object' || Array.isArray(hist)) return bad('Invalid party history');
  for (const [k, v] of Object.entries(hist)) if (!getParty(k) || !isInt(v, 1)) return bad('Invalid party history entry');
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
    if (!s || typeof s.id !== 'string' || staffIds.has(s.id) || (s.role !== 'bartender' && s.role !== 'bouncer') || typeof s.name !== 'string') return bad('Invalid staff member');
    if (s.post !== null && (!s.post || !isInt(s.post.col) || !isInt(s.post.row) || s.post.col >= room.cols || s.post.row >= room.rows)) return bad('Invalid bouncer post');
    if (s.role === 'bouncer' && s.barId !== null) return bad('Bouncer assigned to a bar');
    if (s.mode !== 'speed' && s.mode !== 'tricks') return bad('Invalid bartender mode');
    if (s.barId !== null && !ids.has(s.barId)) return bad('Staff assigned to missing bar');
    staffIds.add(s.id);
  }
  return { ok: true, state: d as unknown as ClubState };
}
