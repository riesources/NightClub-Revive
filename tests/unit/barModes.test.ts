import { describe, expect, it } from 'vitest';
import { tuning } from '../../src/data/tuning';
import { refillDrinks, serveDrink, stockCapacity, type DrinkOrder } from '../../src/domain/bar';
import { createNewClub } from '../../src/domain/club';
import { buyAndPlace, sellFurniture } from '../../src/domain/economy';
import { Game } from '../../src/domain/game';
import { createRng } from '../../src/domain/rng';
import { bartenderModeEffect, setBartenderMode, switchRole } from '../../src/domain/staff';
import { LocalSaveRepository, MemoryStore, SAVE_KEY } from '../../src/persistence/localSaveRepository';

const withTank = () => {
  const r = buyAndPlace({ ...createNewClub(0), level: 2, cash: 10_000 }, 'drink_tank', 5, 7);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

describe('drink tanks', () => {
  it('each tank adds capacity, and refills can use it', () => {
    const base = createNewClub(0);
    expect(stockCapacity(base)).toBe(tuning.barStockCapacity);
    const s = { ...withTank(), stock: { drinks: tuning.barStockCapacity } };
    expect(stockCapacity(s)).toBe(tuning.barStockCapacity + tuning.barTankCapacity);
    const r = refillDrinks(s);
    expect(r.ok && r.state.stock.drinks).toBe(tuning.barStockCapacity + tuning.barRefillAmount);
    expect(refillDrinks(base.stock.drinks >= stockCapacity(base) ? base : { ...base, stock: { drinks: tuning.barStockCapacity } }).ok).toBe(false);
  });

  it('selling a tank clamps stock to the new capacity', () => {
    const s = { ...withTank(), stock: { drinks: 280 } };
    const tank = s.furniture.find((f) => f.catalogId === 'drink_tank')!;
    const r = sellFurniture(s, tank.id);
    expect(r.ok && r.state.stock.drinks).toBe(tuning.barStockCapacity);
  });
});

describe('bartender modes', () => {
  it('Tricks doubles tips; Speed halves serve time', () => {
    expect(bartenderModeEffect('tricks')).toEqual({ serveMs: tuning.serveDurationMs * tuning.tricksServeMultiplier, tipMultiplier: tuning.tricksTipMultiplier });
    expect(bartenderModeEffect('speed')).toEqual({ serveMs: tuning.serveDurationMs * tuning.speedServeMultiplier, tipMultiplier: 1 });
    const s = createNewClub(0);
    const a = serveDrink(s, { id: 'a', status: 'pending' } as DrinkOrder, 90, 100, 0.2, 1);
    const b = serveDrink(s, { id: 'b', status: 'pending' } as DrinkOrder, 90, 100, 0.2, 2);
    if (!a.ok || !b.ok) throw new Error();
    expect(b.tip).toBeGreaterThanOrEqual(a.tip * 2 - 1);
  });

  it('only bartenders have a mode', () => {
    const s = createNewClub(0);
    expect(setBartenderMode(s, s.staff[0].id, 'tricks').ok).toBe(true);
    const b = switchRole(s, s.staff[0].id);
    if (!b.ok) throw new Error();
    expect(setBartenderMode(b.state, s.staff[0].id, 'tricks').ok).toBe(false);
  });

  it('in a busy club, Speed sells more drinks and Tricks earns more tip per drink', () => {
    const run = (mode: 'speed' | 'tricks') => {
      const s0 = createNewClub(0);
      const s = { ...s0, stock: { drinks: 10_000 }, staff: s0.staff.map((m) => ({ ...m, mode })) };
      const game = new Game(s, createRng(21));
      game.startSet('pop', 1e7);
      for (let t = 1e7; t < 1e7 + 240_000; t += 50) game.tick(t);
      return game.state.stats;
    };
    const speed = run('speed');
    const tricks = run('tricks');
    expect(speed.drinksSold).toBeGreaterThan(tricks.drinksSold);
    expect(tricks.tipsEarned / tricks.drinksSold).toBeGreaterThan(speed.tipsEarned / speed.drinksSold);
  });
});

describe('v4 -> v5 migration', () => {
  it('gives existing staff the Speed mode', () => {
    const s = createNewClub(0);
    const v4 = { ...s, schemaVersion: 4, staff: s.staff.map(({ mode: _m, ...rest }) => rest) };
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, JSON.stringify(v4));
    const r = new LocalSaveRepository(store).load();
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.state.staff[0].mode).toBe('speed');
  });
});
