import { LEVEL_XP, MAX_LEVEL, ROOM_SIZE_BY_LEVEL } from '../data/progression';
import { tuning } from '../data/tuning';
import type { ClubState } from './types';

export function levelForXp(xp: number): number {
  let level = 1;
  for (let l = 1; l <= MAX_LEVEL; l++) if (xp >= LEVEL_XP[l]) level = l;
  return level;
}

export function xpProgress(xp: number): { level: number; into: number; needed: number } {
  const level = levelForXp(xp);
  if (level >= MAX_LEVEL) return { level, into: 1, needed: 1 };
  const base = LEVEL_XP[level];
  return { level, into: xp - base, needed: LEVEL_XP[level + 1] - base };
}

export function roomSizeForLevel(level: number): { cols: number; rows: number } {
  return ROOM_SIZE_BY_LEVEL[Math.min(level, ROOM_SIZE_BY_LEVEL.length - 1)];
}

/**
 * Credit income. Mutates the given draft. Increases cash, lifetime earnings and XP,
 * then applies level-ups and the automatic room expansion (GameYum: CONFIRMED that
 * the club expands on level-up; sizes PROPOSED). Rooms never shrink.
 */
export function creditIncome(draft: ClubState, amount: number): { leveledUp: boolean } {
  const coins = Math.max(0, Math.floor(amount));
  draft.cash += coins;
  draft.totalEarned += coins;
  draft.xp += Math.floor(coins * tuning.xpPerCoin);
  const newLevel = levelForXp(draft.xp);
  const leveledUp = newLevel > draft.level;
  if (leveledUp) {
    draft.level = newLevel;
    const size = roomSizeForLevel(newLevel);
    draft.room = { cols: Math.max(draft.room.cols, size.cols), rows: Math.max(draft.room.rows, size.rows) };
  }
  return { leveledUp };
}
