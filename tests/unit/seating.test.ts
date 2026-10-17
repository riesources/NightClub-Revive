import { describe, expect, it } from 'vitest';
import { createNewClub } from '../../src/domain/club';
import { buyAndPlace } from '../../src/domain/economy';
import { Game } from '../../src/domain/game';
import { adjacentWalkableCells, blockedCells, cellKey, footprintCells, seatSlots } from '../../src/domain/grid';
import type { Guest } from '../../src/domain/guests/guest';
import { createRng } from '../../src/domain/rng';
import type { ClubState, Facing } from '../../src/domain/types';

const T0 = 90_000_000;

function clubWith(id: string, col: number, row: number, facing: Facing = 0): { state: ClubState; seatId: string } {
  const r = buyAndPlace({ ...createNewClub(0), level: 10, cash: 100_000 }, id, col, row, facing);
  if (!r.ok) throw new Error(r.reason);
  return { state: r.state, seatId: r.state.furniture.at(-1)!.id };
}

/** Put a guest beside the seat in SEEKING_SEAT with nothing left to walk. */
function seeker(game: Game, seatId: string, now: number, k = 0): Guest {
  const g = game.sim.spawn(game.state, now);
  g.troublemaker = false;
  const seat = game.state.furniture.find((f) => f.id === seatId)!;
  const cell = adjacentWalkableCells(game.state, seat, blockedCells(game.state))[k];
  g.x = cell.col + 0.5;
  g.y = cell.row + 0.5;
  g.path = [];
  g.state = 'SEEKING_SEAT';
  g.seatId = seatId;
  return g;
}

describe('seat slots', () => {
  it('stools seat one, sofas one per tile, 2x2 booths and round sofas four', () => {
    const count = (id: string) => seatSlots({ id: 'x', catalogId: id, col: 3, row: 3, facing: 0 }).length;
    expect(count('stool_red')).toBe(1);
    expect(count('sofa_red')).toBe(2);
    expect(count('booth_lounge')).toBe(4);
    expect(count('sofa_round_red')).toBe(4);
    expect(count('booth_white_curved')).toBe(4);
    expect(count('plant_palm')).toBe(0);
  });

  it('every slot lies on the seat itself in all four facings', () => {
    for (const id of ['sofa_red', 'booth_lounge', 'sofa_round_red', 'lounge_black', 'egg_chair', 'stool_red']) {
      for (const facing of [0, 1, 2, 3] as const) {
        const f = { id: 'x', catalogId: id, col: 3, row: 3, facing };
        const cells = new Set(footprintCells(id, 3, 3, facing).map((c) => cellKey(c.col, c.row)));
        for (const s of seatSlots(f)) expect(cells.has(cellKey(Math.floor(s.x), Math.floor(s.y))), `${id} f${facing}`).toBe(true);
      }
    }
  });
});

describe('guests sitting', () => {
  it('a guest who reaches a sofa sits on it, then gets up beside it', () => {
    const { state, seatId } = clubWith('sofa_red', 4, 6);
    const game = new Game(state, createRng(2));
    game.sim.spawnEnabled = false;
    const g = seeker(game, seatId, T0);
    const before = { x: g.x, y: g.y };
    game.tick(T0);
    game.tick(T0 + 50);
    expect(g.state).toBe('SITTING_OR_SOCIALIZING');
    expect(g.sitting).toBe(true);
    const seat = game.state.furniture.find((f) => f.id === seatId)!;
    expect(seatSlots(seat).some((s) => s.x === g.x && s.y === g.y)).toBe(true);
    // activity over -> gets up on the tile they came from, then walks off
    g.activityEndsAt = T0;
    game.tick(T0 + 100);
    expect(g.sitting).toBe(false);
    expect(blockedCells(game.state).has(cellKey(Math.floor(g.x), Math.floor(g.y)))).toBe(false);
    expect(Math.hypot(g.x - before.x, g.y - before.y)).toBeLessThan(2.5);
    expect(game.sim.illegalTransitions).toBe(0);
  });

  it('a full seat leaves the next guest standing beside it', () => {
    const { state, seatId } = clubWith('stool_red', 4, 6);
    const game = new Game(state, createRng(3));
    game.sim.spawnEnabled = false;
    const a = seeker(game, seatId, T0, 0);
    const b = seeker(game, seatId, T0, 1);
    game.tick(T0);
    game.tick(T0 + 50);
    expect([a.sitting, b.sitting].filter(Boolean)).toHaveLength(1);
    expect(b.state).toBe('SITTING_OR_SOCIALIZING');
  });

  it('storing the seat under a sitting guest stands them up on a free tile', () => {
    const { state, seatId } = clubWith('sofa_red', 4, 6);
    const game = new Game(state, createRng(4));
    game.sim.spawnEnabled = false;
    const g = seeker(game, seatId, T0);
    game.tick(T0);
    game.tick(T0 + 50);
    expect(g.sitting).toBe(true);
    expect(game.store(seatId).ok).toBe(true);
    game.tick(T0 + 100);
    expect(game.sim.guests).toContain(g);
    expect(g.sitting).toBe(false);
    expect(blockedCells(game.state).has(cellKey(Math.floor(g.x), Math.floor(g.y)))).toBe(false);
  });

  it('a busy club with seats: guests really sit, and nobody ends up standing inside furniture', () => {
    let s: ClubState = { ...createNewClub(0), level: 10, cash: 200_000, popularity: 80, room: { cols: 14, rows: 14 } };
    for (const [id, c, r, f] of [['sofa_red', 2, 8, 0], ['sofa_round_red', 6, 9, 0], ['booth_lounge', 10, 9, 2], ['stool_red', 10, 2, 0], ['lounge_black', 3, 11, 3]] as const) {
      const res = buyAndPlace(s, id, c, r, f);
      if (!res.ok) throw new Error(`${id}: ${res.reason}`);
      s = res.state;
    }
    const game = new Game(s, createRng(11));
    game.startSet('pop', T0);
    let sat = 0;
    let insideFurniture = 0;
    for (let t = T0; t < T0 + 6 * 60_000; t += 100) {
      game.tick(t);
      const blocked = blockedCells(game.state);
      for (const g of game.sim.guests) {
        if (g.sitting) sat++;
        else if (g.path.length === 0 && blocked.has(cellKey(Math.floor(g.x), Math.floor(g.y)))) insideFurniture++;
      }
    }
    expect(sat).toBeGreaterThan(100);
    expect(insideFurniture).toBe(0);
    expect(game.sim.illegalTransitions).toBe(0);
  });
});
