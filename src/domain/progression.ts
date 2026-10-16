import { LEVEL_XP, MAX_LEVEL, ROOM_SIZE_BY_LEVEL, levelReward } from '../data/progression';
import { tuning } from '../data/tuning';
import type { ClubState } from './types';

export function levelForXp(xp: number): number {
  let level = 0;
  for (let l = 0; l <= MAX_LEVEL; l++) if (xp >= LEVEL_XP[l]) level = l;
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
 * Credit income. Mutates the given draft: cash, lifetime earnings and XP rise,
 * then level-ups apply their cash reward and the automatic room expansion
 * (GameYum: CONFIRMED that the club expands on level-up). Rooms never shrink.
 * Level rewards add to cash but not to earnings/XP, so they cannot chain.
 */
export function creditIncome(draft: ClubState, amount: number): { leveledUp: boolean; reward: number } {
  const coins = Math.max(0, Math.floor(amount));
  draft.cash += coins;
  draft.totalEarned += coins;
  draft.xp += Math.floor(coins * tuning.xpPerCoin);
  const newLevel = levelForXp(draft.xp);
  if (newLevel <= draft.level) return { leveledUp: false, reward: 0 };
  let reward = 0;
  for (let l = draft.level + 1; l <= newLevel; l++) reward += levelReward(l);
  draft.level = newLevel;
  draft.cash += reward;
  const size = roomSizeForLevel(newLevel);
  draft.room = { cols: Math.max(draft.room.cols, size.cols), rows: Math.max(draft.room.rows, size.rows) };
  return { leveledUp: true, reward };
}
