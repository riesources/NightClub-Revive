import { describe, expect, it } from 'vitest';
import { PARTIES, getParty } from '../../src/data/parties';
import { chargeCover, coverCharge } from '../../src/domain/bar';
import { createNewClub } from '../../src/domain/club';
import { SCHEMA_VERSION } from '../../src/domain/types';
import { Game, type GameEvent } from '../../src/domain/game';
import { finishParty, partyActive, startParty } from '../../src/domain/party';
import { createRng } from '../../src/domain/rng';
import { LocalSaveRepository, MemoryStore, SAVE_KEY } from '../../src/persistence/localSaveRepository';

const T0 = 80_000_000;
const NEON = getParty('neon_night')!;
const VIP = getParty('velvet_vip')!;

const rich = () => ({ ...createNewClub(0), level: 5, cash: 100_000 });

const started = (id = NEON.id) => {
  const r = startParty(rich(), id, T0);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

describe('starting parties', () => {
  it('charges once and runs on absolute timestamps', () => {
    const s = started();
    expect(s.cash).toBe(100_000 - NEON.cost);
    expect(s.party).toEqual({ id: NEON.id, startsAt: T0, endsAt: T0 + NEON.durationMs, guests: 0 });
    expect(partyActive(s, T0 + NEON.durationMs - 1)).toBe(true);
    expect(partyActive(s, T0 + NEON.durationMs)).toBe(false);
  });

  it('refuses when locked, broke, unknown, or a party is already on', () => {
    const top = PARTIES[PARTIES.length - 1];
    expect(startParty({ ...rich(), level: 0 }, NEON.id, T0).ok).toBe(false);
    expect(startParty({ ...rich(), cash: 10 }, NEON.id, T0).ok).toBe(false);
    expect(startParty(rich(), 'nope', T0).ok).toBe(false);
    expect(startParty(rich(), top.id, T0).ok).toBe(top.requiredLevel <= 5);
    expect(startParty(started(), NEON.id, T0).ok).toBe(false);
  });
});

describe('party guests and cover', () => {
  it('counts arrivals only while the party runs and applies the cover multiplier', () => {
    const s = started(VIP.id);
    const a = chargeCover(s, T0 + 1000);
    expect(a.paid).toBe(Math.round(coverCharge(s.popularity) * VIP.coverMultiplier));
    expect(a.state.party!.guests).toBe(1);
    const late = chargeCover(a.state, T0 + VIP.durationMs + 1);
    expect(late.paid).toBe(coverCharge(s.popularity));
    expect(late.state.party!.guests).toBe(1);
  });
});

describe('finishing parties', () => {
  it('pays the reward once when the goal is met', () => {
    const s = started();
    s.party!.guests = NEON.goalGuests;
    expect(finishParty(s, T0 + 1000)).toBe(null); // still running
    const end = s.party!.endsAt;
    const f = finishParty(s, end)!;
    expect(f.success).toBe(true);
    expect(f.state.cash).toBe(s.cash + NEON.rewardCash);
    expect(f.state.popularity).toBe(s.popularity + NEON.rewardPopularity);
    expect(f.state.partyHistory).toEqual({ [NEON.id]: 1 });
    expect(f.state.party).toBe(null);
    expect(finishParty(f.state, end + 1)).toBe(null);
  });

  it('pays nothing and logs nothing when the goal is missed', () => {
    const s = started();
    s.party!.guests = NEON.goalGuests - 1;
    const f = finishParty(s, s.party!.endsAt)!;
    expect(f.success).toBe(false);
    expect(f.state.cash).toBe(s.cash);
    expect(f.state.popularity).toBe(s.popularity);
    expect(f.state.partyHistory).toEqual({});
    expect(f.state.party).toBe(null);
  });

  it('a reload long after the party ended settles it exactly once', () => {
    const s = started();
    s.party!.guests = NEON.goalGuests;
    const game = new Game(s, createRng(5));
    game.sim.spawnEnabled = false;
    const events: GameEvent[] = [];
    game.on((e) => events.push(e));
    const later = s.party!.endsAt + 3_600_000;
    for (let t = later; t < later + 500; t += 50) game.tick(t);
    expect(events.filter((e) => e.type === 'partyEnded')).toHaveLength(1);
    expect(game.state.partyHistory[NEON.id]).toBe(1);
    expect(game.state.cash).toBe(s.cash + NEON.rewardCash);
  });
});

describe('party in the club', () => {
  const arrivals = (party: boolean, seed: number) => {
    let s = { ...rich(), room: { cols: 14, rows: 14 } };
    if (party) {
      const r = startParty(s, NEON.id, T0);
      if (!r.ok) throw new Error();
      s = r.state;
    }
    const game = new Game(s, createRng(seed));
    game.startSet('pop', T0);
    for (let t = T0; t < T0 + 90_000; t += 50) game.tick(t);
    return game;
  };

  it('brings guests in faster and counts them toward the goal', () => {
    let normal = 0;
    let rush = 0;
    for (const seed of [1, 2, 3]) {
      normal += arrivals(false, seed).state.stats.guestsVisited;
      const g = arrivals(true, seed);
      rush += g.state.stats.guestsVisited;
      expect(g.state.party!.guests).toBeGreaterThan(0);
      expect(g.sim.illegalTransitions).toBe(0);
    }
    expect(rush).toBeGreaterThan(normal * 1.3);
  });
});

describe('v5 -> v6 migration', () => {
  it('adds no party and an empty history', () => {
    const { party: _p, partyHistory: _h, ...rest } = createNewClub(0);
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, JSON.stringify({ ...rest, schemaVersion: 5 }));
    const r = new LocalSaveRepository(store).load();
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(r.state.party).toBe(null);
      expect(r.state.partyHistory).toEqual({});
    }
  });
});
