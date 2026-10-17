import { describe, expect, it } from 'vitest';
import { createNewClub } from '../../src/domain/club';
import { buyAndPlace, moveFurniture } from '../../src/domain/economy';
import { backSpot, footprintCells, footprintSize, nextFacing } from '../../src/domain/grid';
import type { Facing } from '../../src/domain/types';
import { validateState } from '../../src/persistence/validate';

describe('four-way rotation', () => {
  it('cycles 0 -> 1 -> 2 -> 3 -> 0 and odd facings swap the footprint', () => {
    expect([0, 1, 2, 3].map((f) => nextFacing(f as Facing))).toEqual([1, 2, 3, 0]);
    expect(footprintSize('sofa_red', 0)).toEqual({ w: 2, h: 1 });
    expect(footprintSize('sofa_red', 1)).toEqual({ w: 1, h: 2 });
    expect(footprintSize('sofa_red', 2)).toEqual({ w: 2, h: 1 });
    expect(footprintSize('sofa_red', 3)).toEqual({ w: 1, h: 2 });
    expect(footprintCells('sofa_red', 4, 5, 3)).toEqual([{ col: 4, row: 5 }, { col: 4, row: 6 }]);
  });

  it('a placed item turns through all four directions in place, for free', () => {
    let s = { ...createNewClub(0), level: 2, cash: 10_000 };
    const r = buyAndPlace(s, 'sofa_red', 4, 6);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    const sofa = s.furniture.at(-1)!;
    const cash = s.cash;
    let facing: Facing = 0;
    for (let i = 0; i < 4; i++) {
      facing = nextFacing(facing);
      const m = moveFurniture(s, sofa.id, sofa.col, sofa.row, facing);
      if (!m.ok) throw new Error(m.reason);
      s = m.state;
      expect(s.furniture.find((f) => f.id === sofa.id)!.facing).toBe(facing);
    }
    expect(facing).toBe(0);
    expect(s.cash).toBe(cash);
  });

  it('the worker spot is on the back edge for each facing', () => {
    expect(backSpot(4, 2, 2, 1, 0)).toEqual({ x: 5, y: 2.05 });
    expect(backSpot(4, 2, 1, 2, 1)).toEqual({ x: 4.05, y: 3 });
    expect(backSpot(4, 2, 2, 1, 2)).toEqual({ x: 5, y: 2.95 });
    expect(backSpot(4, 2, 1, 2, 3)).toEqual({ x: 4.95, y: 3 });
  });

  it('saves keep facings 2 and 3 and reject anything else', () => {
    const s = createNewClub(0);
    const plant = { id: 'fx', catalogId: 'sofa_red', col: 4, row: 6 };
    expect(validateState({ ...s, furniture: [...s.furniture, { ...plant, facing: 3 }] }).ok).toBe(true);
    expect(validateState({ ...s, furniture: [...s.furniture, { ...plant, facing: 4 }] }).ok).toBe(false);
  });
});
