import { describe, expect, it } from 'vitest';
import { createNewClub } from '../../src/domain/club';
import { Game } from '../../src/domain/game';
import { blockedCells, cellKey } from '../../src/domain/grid';
import { findPath } from '../../src/domain/pathfinding/astar';
import { createRng } from '../../src/domain/rng';
import { tuning } from '../../src/data/tuning';
import type { GameEvent } from '../../src/domain/game';

const T0 = 10_000_000;

function run(game: Game, fromMs: number, durationMs: number, stepMs = 50): number {
  let t = fromMs;
  for (; t < fromMs + durationMs; t += stepMs) game.tick(t);
  return t;
}

describe('pathfinding', () => {
  it('finds a route around obstacles', () => {
    const room = { cols: 5, rows: 5 };
    const blocked = new Set(['2,0', '2,1', '2,2', '2,3']);
    const p = findPath(room, blocked, { col: 0, row: 0 }, { col: 4, row: 0 });
    expect(p).not.toBeNull();
    expect(p!.some((c) => c.row === 4)).toBe(true);
    expect(p!.every((c) => !blocked.has(cellKey(c.col, c.row)))).toBe(true);
  });

  it('returns null when walled off', () => {
    const blocked = new Set(['2,0', '2,1', '2,2', '2,3', '2,4']);
    expect(findPath({ cols: 5, rows: 5 }, blocked, { col: 0, row: 0 }, { col: 4, row: 0 })).toBeNull();
  });
});

describe('guest simulation', () => {
  it('guests arrive, buy drinks, and stock decreases exactly once per sale', () => {
    const game = new Game(createNewClub(0), createRng(1));
    game.startSet('pop', T0);
    let sales = 0;
    let paid = 0;
    game.on((e: GameEvent) => {
      if (e.type === 'sale') {
        sales++;
        paid += e.paid;
      }
      if (e.type === 'cover') paid += e.paid;
      if (e.type === 'levelUp') paid += e.reward;
    });
    const startDrinks = game.state.stock.drinks;
    const startCash = game.state.cash;
    run(game, T0, 120_000);
    expect(game.sim.guests.length).toBeGreaterThan(3);
    expect(sales).toBeGreaterThan(0);
    expect(game.state.stock.drinks).toBe(startDrinks - sales);
    expect(game.state.stats.drinksSold).toBe(sales);
    expect(game.state.cash).toBe(startCash + paid);
    expect(game.sim.illegalTransitions).toBe(0);
  });

  it('with an empty bar, no drinks are sold and stock never goes negative', () => {
    const s = { ...createNewClub(0), stock: { drinks: 0 } };
    const game = new Game(s, createRng(2));
    game.startSet('pop', T0);
    let outOfDrinks = 0;
    game.on((e) => {
      if (e.type === 'outOfDrinks') outOfDrinks++;
      if (e.type === 'sale') throw new Error('sold a drink with no stock');
    });
    run(game, T0, 90_000);
    expect(game.state.stock.drinks).toBe(0);
    expect(outOfDrinks).toBeGreaterThan(0);
  });

  it('bartender only serves the assigned bar', () => {
    const s = createNewClub(0);
    s.staff[0].barId = null; // nobody working
    const game = new Game(s, createRng(3));
    game.startSet('pop', T0);
    game.on((e) => {
      if (e.type === 'sale') throw new Error('unstaffed bar served');
    });
    run(game, T0, 60_000);
    expect(game.state.stats.drinksSold).toBe(0);
  });

  it('Drop the Bass sends free guests to the bar', () => {
    const game = new Game(createNewClub(0), createRng(4));
    game.startSet('pop', T0);
    const t = run(game, T0, 30_000);
    game.dropTheBass(t);
    const heading = game.sim.guests.filter((g) => g.state === 'THIRSTY' || g.state === 'QUEUING_FOR_BAR').length;
    expect(heading).toBeGreaterThan(0);
  });

  it('30+ guests over several minutes: no stuck guests, no illegal transitions', () => {
    // 12x12 room -> capacity 36, so the 30-guest target doesn't depend on level-ups mid-run.
    const game = new Game({ ...createNewClub(0), room: { cols: 12, rows: 12 } }, createRng(5));
    game.startSet('electronic', T0);
    game.state.stock.drinks = 10_000; // enough stock for the soak
    let t = T0;
    let peak = 0;
    const lastProgress = new Map<string, { x: number; y: number; at: number }>();
    for (; t < T0 + 6 * 60_000; t += 50) {
      game.tick(t);
      peak = Math.max(peak, game.sim.guests.length);
      for (const g of game.sim.guests) {
        const prev = lastProgress.get(g.id);
        if (!prev || prev.x !== g.x || prev.y !== g.y) lastProgress.set(g.id, { x: g.x, y: g.y, at: t });
      }
    }
    expect(peak).toBeGreaterThanOrEqual(30);
    // A walking guest must never sit still for more than stuck timeout + slack.
    const walking = new Set(['ENTERING', 'WALKING_TO_DANCE_FLOOR', 'THIRSTY', 'SEEKING_SEAT', 'LEAVING']);
    for (const g of game.sim.guests) {
      if (walking.has(g.state) && g.path.length) {
        expect(t - lastProgress.get(g.id)!.at).toBeLessThan(tuning.guestStuckTimeoutMs + 2000);
      }
    }
    expect(game.sim.illegalTransitions).toBe(0);
    expect(game.state.stats.guestsVisited).toBeGreaterThan(10);
  });

  it('guests recover when furniture is dropped onto their path', () => {
    const game = new Game(createNewClub(0), createRng(6));
    game.startSet('pop', T0);
    let t = run(game, T0, 20_000);
    // Wall off most of the room mid-simulation with plants.
    let s = game.state;
    s = { ...s, cash: 1e9 };
    game.replaceState(s);
    for (let c = 0; c < s.room.cols; c++) if (c !== Math.floor(s.room.cols / 2)) game.buy('plant_palm', c, 9);
    t = run(game, t, 60_000);
    expect(game.sim.illegalTransitions).toBe(0);
    const blocked = blockedCells(game.state);
    for (const g of game.sim.guests) for (const c of g.path) expect(blocked.has(cellKey(c.col, c.row))).toBe(false);
  });
});
