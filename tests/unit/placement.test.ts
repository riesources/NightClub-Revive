import { describe, expect, it } from 'vitest';
import { createNewClub } from '../../src/domain/club';
import { buyAndPlace, moveFurniture, sellFurniture, sellRefund } from '../../src/domain/economy';
import { checkPlacement, entranceCell } from '../../src/domain/grid';
import { tuning } from '../../src/data/tuning';
import { validateState } from '../../src/persistence/validate';
import type { ClubState } from '../../src/domain/types';

import { getFurnitureDef } from '../../src/data/furnitureCatalog';

const SOFA = getFurnitureDef('sofa_red')!.price;
const empty = (): ClubState => ({ ...createNewClub(0), level: 1, furniture: [], staff: [] });

describe('placement rules', () => {
  it('starter club layout is itself valid', () => {
    const v = validateState(createNewClub(0) as unknown as Record<string, unknown>);
    expect(v.ok).toBe(true);
  });

  it('rejects placement outside the room on every edge', () => {
    const s = empty();
    expect(checkPlacement(s, 'plant_palm', -1, 0, 0).valid).toBe(false);
    expect(checkPlacement(s, 'plant_palm', 0, -1, 0).valid).toBe(false);
    expect(checkPlacement(s, 'plant_palm', s.room.cols, 0, 0).valid).toBe(false);
    expect(checkPlacement(s, 'plant_palm', 0, s.room.rows, 0).valid).toBe(false);
    // 2-wide bar hanging off the right edge
    expect(checkPlacement(s, 'bar_basic', s.room.cols - 1, 0, 0).valid).toBe(false);
    expect(checkPlacement(s, 'bar_basic', s.room.cols - 2, 0, 0).valid).toBe(true);
  });

  it('rejects overlapping footprints, including partial overlap', () => {
    const r = buyAndPlace({ ...empty(), level: 2 }, 'booth_lounge', 2, 2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(checkPlacement(r.state, 'plant_palm', 3, 3, 0).valid).toBe(false);
    expect(checkPlacement(r.state, 'bar_basic', 1, 2, 0).valid).toBe(false);
    expect(checkPlacement(r.state, 'bar_basic', 0, 2, 0).valid).toBe(true);
  });

  it('keeps the entrance clear', () => {
    const s = empty();
    const e = entranceCell(s.room);
    expect(checkPlacement(s, 'plant_palm', e.col, e.row, 0).valid).toBe(false);
    expect(checkPlacement(s, 'plant_palm', e.col, e.row - 1, 0).valid).toBe(false);
  });

  it('facing swaps the footprint', () => {
    const s = empty();
    // 2x1 bar rotated is 1x2: fits in the last column
    expect(checkPlacement(s, 'bar_basic', s.room.cols - 1, 0, 1).valid).toBe(true);
    expect(checkPlacement(s, 'bar_basic', 0, s.room.rows - 1, 1).valid).toBe(false);
  });
});

describe('purchase transactions', () => {
  it('charges exactly the price once on success', () => {
    const s = empty();
    const r = buyAndPlace(s, 'sofa_red', 1, 1);
    expect(r.ok && r.state.cash).toBe(s.cash - SOFA);
    expect(r.ok && r.state.furniture.length).toBe(1);
    expect(s.furniture.length).toBe(0); // input untouched
  });

  it('level-gated items are refused below their level', () => {
    expect(buyAndPlace({ ...empty(), level: 0 }, 'sofa_red', 1, 1)).toEqual({ ok: false, reason: 'Unlocks at level 1' });
  });

  it('failed purchases never change cash', () => {
    const s = empty();
    const poor = { ...s, cash: 10 };
    for (const r of [
      buyAndPlace(poor, 'sofa_red', 1, 1), // funds
      buyAndPlace(s, 'sofa_red', -5, 1), // bounds
      buyAndPlace(s, 'dj_pro', 1, 1), // level lock
      buyAndPlace(s, 'nope', 1, 1), // unknown
    ]) {
      expect(r.ok).toBe(false);
    }
    expect(poor.cash).toBe(10);
    expect(s.cash).toBe(tuning.startingCash);
  });

  it('cancel = never calling buy, so no charge (placement preview is pure)', () => {
    const s = empty();
    checkPlacement(s, 'sofa_red', 1, 1, 0);
    expect(s.cash).toBe(tuning.startingCash);
    expect(s.furniture).toHaveLength(0);
  });

  it('allows spending down to exactly zero but never negative', () => {
    const s = { ...empty(), cash: SOFA };
    const r = buyAndPlace(s, 'sofa_red', 1, 1);
    expect(r.ok && r.state.cash).toBe(0);
    if (r.ok) expect(buyAndPlace(r.state, 'stool_red', 5, 5).ok).toBe(false);
  });
});

describe('move and sell', () => {
  it('move relocates without duplicating or charging', () => {
    const b = buyAndPlace(empty(), 'sofa_red', 1, 1);
    if (!b.ok) throw new Error();
    const id = b.state.furniture[0].id;
    const m = moveFurniture(b.state, id, 4, 4);
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    expect(m.state.furniture).toHaveLength(1);
    expect(m.state.furniture[0]).toMatchObject({ id, col: 4, row: 4 });
    expect(m.state.cash).toBe(b.state.cash);
  });

  it('move may overlap its own old footprint', () => {
    const b = buyAndPlace(empty(), 'sofa_red', 1, 1);
    if (!b.ok) throw new Error();
    expect(moveFurniture(b.state, b.state.furniture[0].id, 2, 1).ok).toBe(true);
  });

  it('invalid move leaves the original position', () => {
    let s = empty();
    for (const [id, c, r] of [['sofa_red', 1, 1], ['plant_palm', 5, 5]] as const) {
      const res = buyAndPlace(s, id, c, r);
      if (!res.ok) throw new Error();
      s = res.state;
    }
    const sofa = s.furniture[0];
    const m = moveFurniture(s, sofa.id, 4, 5); // overlaps plant at 5,5
    expect(m.ok).toBe(false);
    expect(s.furniture[0]).toMatchObject({ col: 1, row: 1 });
  });

  it('sell removes once and refunds once', () => {
    const b = buyAndPlace(empty(), 'sofa_red', 1, 1);
    if (!b.ok) throw new Error();
    const id = b.state.furniture[0].id;
    const sold = sellFurniture(b.state, id);
    expect(sold.ok && sold.state.cash).toBe(b.state.cash + sellRefund('sofa_red'));
    expect(sold.ok && sold.state.furniture).toHaveLength(0);
    if (sold.ok) expect(sellFurniture(sold.state, id).ok).toBe(false);
  });

  it('selling a bar unassigns its bartender', () => {
    const s = createNewClub(0);
    const bar = s.furniture.find((f) => f.catalogId === 'bar_basic')!;
    const sold = sellFurniture(s, bar.id);
    expect(sold.ok && sold.state.staff[0].barId).toBe(null);
  });
});
