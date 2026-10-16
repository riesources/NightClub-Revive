import { describe, expect, it } from 'vitest';
import { chargeCover, coverCharge, refillDrinks, serveDrink, tipFor, type DrinkOrder } from '../../src/domain/bar';
import { computeLuxury, createNewClub } from '../../src/domain/club';
import * as dj from '../../src/domain/dj';
import { sellFurniture } from '../../src/domain/economy';
import { creditIncome, levelForXp } from '../../src/domain/progression';
import { assignBartender, bartenderForBar, hireBartender, workerSlots } from '../../src/domain/staff';
import { LEVEL_XP } from '../../src/data/progression';
import { tuning } from '../../src/data/tuning';

describe('bar stock', () => {
  it('serving decrements stock exactly once per order', () => {
    const s = createNewClub(0);
    const order: DrinkOrder = { id: 'o1', status: 'pending' };
    const r1 = serveDrink(s, order, 80, 0);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.state.stock.drinks).toBe(s.stock.drinks - 1);
    expect(r1.state.cash).toBe(s.cash + r1.paid);
    const r2 = serveDrink(r1.state, order, 80, 0);
    expect(r2.ok).toBe(false);
  });

  it('empty stock fails clearly without charging', () => {
    const s = { ...createNewClub(0), stock: { drinks: 0 } };
    const order: DrinkOrder = { id: 'o1', status: 'pending' };
    const r = serveDrink(s, order, 80, 0);
    expect(r).toEqual({ ok: false, reason: 'Out of drinks' });
    expect(order.status).toBe('failed');
    expect(s.cash).toBe(tuning.startingCash);
  });

  it('refill adds the configured 100 once and charges once', () => {
    const s = { ...createNewClub(0), stock: { drinks: 20 } };
    const r = refillDrinks(s);
    expect(r.ok && r.state.stock.drinks).toBe(20 + tuning.barRefillAmount);
    expect(r.ok && r.state.cash).toBe(s.cash - tuning.barRefillCost);
  });

  it('refill is capped and refused when full or broke', () => {
    expect(refillDrinks({ ...createNewClub(0), stock: { drinks: tuning.barStockCapacity } }).ok).toBe(false);
    expect(refillDrinks({ ...createNewClub(0), cash: 0, stock: { drinks: 0 } }).ok).toBe(false);
    const r = refillDrinks({ ...createNewClub(0), stock: { drinks: tuning.barStockCapacity - 10 } });
    expect(r.ok && r.state.stock.drinks).toBe(tuning.barStockCapacity);
  });

  it('tips scale with happiness and luxury', () => {
    expect(tipFor(0, 0)).toBe(0);
    expect(tipFor(100, 100)).toBeGreaterThan(tipFor(100, 0));
    expect(tipFor(100, 0)).toBeGreaterThan(tipFor(50, 0));
  });
});

describe('DJ set', () => {
  const T0 = 1_000_000;
  it('starts a set of the confirmed 15 minutes on the starter booth', () => {
    const r = dj.startSet(createNewClub(0), 'pop', T0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.dj.setEndsAt! - r.state.dj.setStartedAt!).toBe(15 * 60_000);
    expect(dj.isPlaying(r.state, T0 + 14 * 60_000)).toBe(true);
    expect(dj.isPlaying(r.state, T0 + 15 * 60_000)).toBe(false);
  });

  it('timer is timestamp based: a long hidden tab finishes exactly once', () => {
    const r = dj.startSet(createNewClub(0), 'pop', T0);
    if (!r.ok) throw new Error();
    // jump 3 hours ahead (tab was suspended)
    const later = T0 + 3 * 3600_000;
    expect(dj.timeRemaining(r.state, later)).toBe(0);
    expect(dj.isPlaying(r.state, later)).toBe(false);
    // cannot double-start while playing, can restart once finished
    expect(dj.startSet(r.state, 'pop', T0 + 1000).ok).toBe(false);
    expect(dj.startSet(r.state, 'hiphop', later).ok).toBe(true);
  });

  it('requires a DJ booth', () => {
    let s = createNewClub(0);
    const booth = s.furniture.find((f) => f.catalogId === 'dj_starter')!;
    const sold = sellFurniture(s, booth.id);
    if (!sold.ok) throw new Error();
    s = sold.state;
    expect(dj.startSet(s, 'pop', T0)).toEqual({ ok: false, reason: 'Place a DJ booth first' });
  });

  it('special actions need music and respect cooldowns', () => {
    const s = createNewClub(0);
    expect(dj.dropTheBass(s, T0).ok).toBe(false);
    const p = dj.startSet(s, 'pop', T0);
    if (!p.ok) throw new Error();
    const a = dj.dropTheBass(p.state, T0 + 1);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(dj.dropTheBass(a.state, T0 + 2).ok).toBe(false);
    expect(dj.dropTheBass(a.state, T0 + 1 + tuning.dropBassCooldownMs).ok).toBe(true);
    const d = dj.dedicateSong(a.state, T0 + 5);
    expect(d.ok).toBe(true);
    if (d.ok) expect(dj.dedicateSong(d.state, T0 + 6).ok).toBe(false);
  });
});

describe('cover charge', () => {
  it('is the confirmed $5 base and grows with popularity', () => {
    expect(coverCharge(0)).toBe(5);
    expect(coverCharge(200)).toBeGreaterThan(5);
  });

  it('credits income once per charge', () => {
    const s = createNewClub(0);
    const r = chargeCover(s);
    expect(r.state.cash).toBe(s.cash + r.paid + r.reward);
    expect(r.state.totalEarned).toBe(r.paid);
    expect(s.totalEarned).toBe(0);
  });
});

describe('staff', () => {
  it('worker slots follow the confirmed 2 + levels 9/13/17/21 pattern', () => {
    expect(workerSlots(0)).toBe(2);
    expect(workerSlots(8)).toBe(2);
    expect(workerSlots(9)).toBe(3);
    expect(workerSlots(21)).toBe(6);
  });

  it('cannot hire beyond open worker slots', () => {
    let s = createNewClub(0);
    const h1 = hireBartender(s);
    if (!h1.ok) throw new Error(h1.reason);
    s = h1.state;
    expect(hireBartender(s).ok).toBe(false);
  });

  it('hiring charges once and adds an unassigned bartender', () => {
    const s = createNewClub(0);
    const r = hireBartender(s);
    expect(r.ok && r.state.cash).toBe(s.cash - tuning.bartenderHireCost);
    expect(r.ok && r.state.staff.at(-1)?.barId).toBe(null);
  });

  it('a bar has at most one bartender; reassigning moves them', () => {
    let s = createNewClub(0);
    const bar = s.furniture.find((f) => f.catalogId === 'bar_basic')!;
    const h = hireBartender(s);
    if (!h.ok) throw new Error();
    s = h.state;
    const newbie = s.staff[1];
    const a = assignBartender(s, newbie.id, bar.id);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(bartenderForBar(a.state, bar.id)?.id).toBe(newbie.id);
    expect(a.state.staff[0].barId).toBe(null);
  });

  it('cannot assign a bartender to a non-bar', () => {
    const s = createNewClub(0);
    const speaker = s.furniture.find((f) => f.catalogId === 'speaker_basic')!;
    expect(assignBartender(s, s.staff[0].id, speaker.id).ok).toBe(false);
  });
});

describe('progression', () => {
  it('level boundaries are exact; play starts at level 0', () => {
    expect(levelForXp(0)).toBe(0);
    expect(levelForXp(LEVEL_XP[1] - 1)).toBe(0);
    expect(levelForXp(LEVEL_XP[1])).toBe(1);
    expect(levelForXp(LEVEL_XP[2] - 1)).toBe(1);
    expect(levelForXp(LEVEL_XP[2])).toBe(2);
  });

  it('reaching level 1 pays the confirmed $500 once, without extra XP', () => {
    const s = createNewClub(0);
    const cash0 = s.cash;
    const r = creditIncome(s, LEVEL_XP[1]);
    expect(r).toEqual({ leveledUp: true, reward: 500 });
    expect(s.cash).toBe(cash0 + LEVEL_XP[1] + 500);
    expect(s.xp).toBe(LEVEL_XP[1]);
    expect(creditIncome(s, 1).leveledUp).toBe(false);
  });

  it('starter club matches the confirmed level-0 HUD: $5,000, 10 popularity, 116 luxury', () => {
    const s = createNewClub(0);
    expect(s.cash).toBe(5000);
    expect(s.popularity).toBe(10);
    expect(computeLuxury(s)).toBe(116);
    expect(s.level).toBe(0);
  });

  it('income tracks lifetime earnings separately from cash and expands the room on level-up', () => {
    const s = createNewClub(0);
    s.cash = 0;
    const { leveledUp } = creditIncome(s, LEVEL_XP[3]);
    expect(leveledUp).toBe(true);
    expect(s.level).toBe(3);
    expect(s.totalEarned).toBe(LEVEL_XP[3]);
    expect(s.room.cols).toBeGreaterThan(tuning.startRoomCols);
  });
});
