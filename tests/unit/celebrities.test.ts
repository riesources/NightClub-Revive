import { describe, expect, it } from 'vitest';
import { CELEBRITIES, CELEB_ARRIVAL_DELAY_MS, getCelebrity } from '../../src/data/celebrities';
import { bookCelebrity, celebrityPhase, finishCelebrityVisit } from '../../src/domain/celebrity';
import { createNewClub } from '../../src/domain/club';
import { Game, type GameEvent } from '../../src/domain/game';
import { createRng } from '../../src/domain/rng';
import { LocalSaveRepository, MemoryStore, SAVE_KEY } from '../../src/persistence/localSaveRepository';

const T0 = 70_000_000;
const NOVA = getCelebrity('dj_nova')!;

const rich = () => ({ ...createNewClub(0), level: 5, cash: 100_000 });

describe('booking celebrities', () => {
  it('charges the cost once and schedules arrival and departure', () => {
    const s = rich();
    const r = bookCelebrity(s, NOVA.id, T0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.cash).toBe(s.cash - NOVA.cost);
    expect(r.state.celebrity).toEqual({ id: NOVA.id, arrivesAt: T0 + CELEB_ARRIVAL_DELAY_MS, leavesAt: T0 + CELEB_ARRIVAL_DELAY_MS + NOVA.visitMs });
    expect(celebrityPhase(r.state, T0)).toBe('coming');
    expect(celebrityPhase(r.state, T0 + CELEB_ARRIVAL_DELAY_MS)).toBe('here');
  });

  it('refuses when locked, broke, unknown, or someone is already booked', () => {
    const top = CELEBRITIES[CELEBRITIES.length - 1];
    expect(bookCelebrity({ ...rich(), level: 0 }, NOVA.id, T0).ok).toBe(false);
    expect(bookCelebrity({ ...rich(), cash: 10 }, NOVA.id, T0).ok).toBe(false);
    expect(bookCelebrity(rich(), 'nobody', T0).ok).toBe(false);
    expect(bookCelebrity(rich(), top.id, T0).ok).toBe(top.requiredLevel <= 5);
    const once = bookCelebrity(rich(), NOVA.id, T0);
    if (!once.ok) throw new Error();
    expect(bookCelebrity(once.state, NOVA.id, T0).ok).toBe(false);
  });

  it('finishing a visit adds to the wall and popularity exactly once', () => {
    const b = bookCelebrity(rich(), NOVA.id, T0);
    if (!b.ok) throw new Error();
    expect(finishCelebrityVisit(b.state, T0).ok).toBe(false); // not over yet
    const end = b.state.celebrity!.leavesAt;
    const f = finishCelebrityVisit(b.state, end);
    expect(f.ok).toBe(true);
    if (!f.ok) return;
    expect(f.state.celebrityWall).toEqual({ [NOVA.id]: 1 });
    expect(f.state.popularity).toBe(b.state.popularity + NOVA.popularityBonus);
    expect(f.state.celebrity).toBe(null);
    expect(finishCelebrityVisit(f.state, end + 1).ok).toBe(false);
  });
});

describe('celebrity visit in the club', () => {
  it('arrives, spends, cheers, leaves, and lands on the wall', () => {
    const game = new Game(rich(), createRng(3));
    game.sim.spawnEnabled = false;
    const events: GameEvent[] = [];
    game.on((e) => events.push(e));
    game.bookCelebrity(NOVA.id, T0);
    const cash0 = game.state.cash;
    let t = T0;
    for (; t < T0 + CELEB_ARRIVAL_DELAY_MS + NOVA.visitMs + 30_000; t += 50) game.tick(t);
    expect(events.some((e) => e.type === 'celebArrived' && e.celebId === NOVA.id)).toBe(true);
    const spent = events.filter((e) => e.type === 'sale').reduce((n, e) => n + (e.type === 'sale' ? e.paid : 0), 0);
    expect(spent).toBeGreaterThanOrEqual(NOVA.spendPerTick * Math.floor(NOVA.visitMs / 10_000) - NOVA.spendPerTick);
    expect(events.filter((e) => e.type === 'celebLeft')).toHaveLength(1);
    expect(game.state.celebrityWall[NOVA.id]).toBe(1);
    expect(game.state.celebrity).toBe(null);
    expect(game.state.cash).toBeGreaterThan(cash0);
    expect(game.sim.guests.some((g) => g.guestClass === 'Celebrity')).toBe(false);
    expect(game.sim.illegalTransitions).toBe(0);
  });

  it('a reload after the visit ended credits the wall once and spawns no VIP', () => {
    const b = bookCelebrity(rich(), NOVA.id, T0);
    if (!b.ok) throw new Error();
    const game = new Game(b.state, createRng(4));
    game.sim.spawnEnabled = false;
    const later = b.state.celebrity!.leavesAt + 3_600_000;
    game.tick(later);
    game.tick(later + 50);
    game.tick(later + 100);
    expect(game.state.celebrityWall[NOVA.id]).toBe(1);
    expect(game.sim.guests).toHaveLength(0);
  });
});

describe('v3 -> v4 migration', () => {
  it('adds an empty celebrity wall and no booking', () => {
    const { celebrityWall: _w, celebrity: _c, ...rest } = createNewClub(0);
    const v3 = { ...rest, schemaVersion: 3 };
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, JSON.stringify(v3));
    const r = new LocalSaveRepository(store).load();
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.state.celebrityWall).toEqual({});
      expect(r.state.celebrity).toBe(null);
    }
  });
});
