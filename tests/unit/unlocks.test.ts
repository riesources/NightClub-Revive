import { describe, expect, it } from 'vitest';
import { CELEBRITIES } from '../../src/data/celebrities';
import { FURNITURE } from '../../src/data/furnitureCatalog';
import { PARTIES } from '../../src/data/parties';
import { LEVEL_TITLES, LEVEL_XP, MAX_LEVEL, WORKER_SLOT_LEVELS } from '../../src/data/progression';
import { levelLadder, nextMilestone, unlocksAtLevel } from '../../src/domain/unlocks';

describe('level ladder', () => {
  it('covers every level with a title and rising XP', () => {
    const ladder = levelLadder();
    expect(ladder).toHaveLength(MAX_LEVEL + 1);
    expect(LEVEL_TITLES).toHaveLength(LEVEL_XP.length);
    for (let i = 1; i < ladder.length; i++) expect(ladder[i].xp).toBeGreaterThan(ladder[i - 1].xp);
    expect(ladder[1].title).toBe('Radiophonic Rookie');
  });

  it('reaches every worker-slot level, so no slot is unreachable', () => {
    expect(Math.max(...WORKER_SLOT_LEVELS)).toBeLessThanOrEqual(MAX_LEVEL);
    for (const l of WORKER_SLOT_LEVELS.filter((x) => x > 0)) expect(unlocksAtLevel(l).some((u) => u.kind === 'worker')).toBe(true);
  });

  it('lists every furniture item, celebrity and party exactly once', () => {
    const all = levelLadder().flatMap((l) => l.unlocks);
    for (const f of FURNITURE) expect(all.filter((u) => u.kind === 'furniture' && u.id === f.id)).toHaveLength(1);
    for (const c of CELEBRITIES) expect(all.filter((u) => u.kind === 'celebrity' && u.id === c.id)).toHaveLength(1);
    for (const p of PARTIES) expect(all.filter((u) => u.kind === 'party' && u.id === p.id)).toHaveLength(1);
  });

  it('level 1 gives the confirmed $500, and the room grows on the right levels', () => {
    expect(unlocksAtLevel(1)).toContainEqual({ kind: 'cash', label: '$500 bonus' });
    expect(unlocksAtLevel(0).some((u) => u.kind === 'cash')).toBe(false);
    expect(unlocksAtLevel(1).some((u) => u.kind === 'room')).toBe(false); // 10x10 at both 0 and 1
    expect(unlocksAtLevel(2)).toContainEqual({ kind: 'room', label: 'Club grows to 11×11' });
  });
});

describe('next milestone', () => {
  it('skips cash-only levels and stops at the cap', () => {
    const m = nextMilestone(0)!;
    expect(m.level).toBe(1);
    expect(m.unlocks.some((u) => u.kind !== 'cash')).toBe(true);
    for (let l = 0; l < MAX_LEVEL; l++) {
      const n = nextMilestone(l);
      if (n) expect(n.level).toBeGreaterThan(l);
    }
    expect(nextMilestone(MAX_LEVEL)).toBe(null);
  });
});
