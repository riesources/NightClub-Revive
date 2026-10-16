import { CELEBRITIES } from '../data/celebrities';
import { FURNITURE } from '../data/furnitureCatalog';
import { PARTIES } from '../data/parties';
import { LEVEL_TITLES, LEVEL_XP, MAX_LEVEL, WORKER_SLOT_LEVELS, levelReward } from '../data/progression';
import { roomSizeForLevel } from './progression';

export type UnlockKind = 'cash' | 'room' | 'worker' | 'furniture' | 'celebrity' | 'party';

export interface Unlock {
  kind: UnlockKind;
  /** Catalogue id for furniture / celebrity / party unlocks. */
  id?: string;
  label: string;
}

export interface LevelInfo {
  level: number;
  title: string;
  /** Lifetime XP needed to reach this level. */
  xp: number;
  unlocks: Unlock[];
}

/** Everything that becomes available on reaching `level`, derived from the data files. */
export function unlocksAtLevel(level: number): Unlock[] {
  const out: Unlock[] = [];
  const reward = level > 0 ? levelReward(level) : 0;
  if (reward > 0) out.push({ kind: 'cash', label: `$${reward.toLocaleString('en-US')} bonus` });
  if (level > 0) {
    const now = roomSizeForLevel(level);
    const before = roomSizeForLevel(level - 1);
    if (now.cols !== before.cols || now.rows !== before.rows) out.push({ kind: 'room', label: `Club grows to ${now.cols}×${now.rows}` });
    const slots = WORKER_SLOT_LEVELS.filter((l) => l === level).length;
    if (slots > 0) out.push({ kind: 'worker', label: slots === 1 ? 'New worker slot' : `${slots} new worker slots` });
  }
  for (const f of FURNITURE) if (f.requiredLevel === level) out.push({ kind: 'furniture', id: f.id, label: f.name });
  for (const c of CELEBRITIES) if (c.requiredLevel === level) out.push({ kind: 'celebrity', id: c.id, label: c.name });
  for (const p of PARTIES) if (p.requiredLevel === level) out.push({ kind: 'party', id: p.id, label: p.name });
  return out;
}

/** The whole level ladder, 0..MAX_LEVEL. */
export function levelLadder(): LevelInfo[] {
  return LEVEL_XP.map((xp, level) => ({ level, title: LEVEL_TITLES[level] ?? `Level ${level}`, xp, unlocks: unlocksAtLevel(level) }));
}

/** The next level that unlocks something other than a cash bonus, or null at the cap. */
export function nextMilestone(level: number): LevelInfo | null {
  for (let l = level + 1; l <= MAX_LEVEL; l++) {
    const unlocks = unlocksAtLevel(l);
    if (unlocks.some((u) => u.kind !== 'cash')) return { level: l, title: LEVEL_TITLES[l] ?? `Level ${l}`, xp: LEVEL_XP[l], unlocks };
  }
  return null;
}
