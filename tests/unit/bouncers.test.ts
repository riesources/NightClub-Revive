import { describe, expect, it } from 'vitest';
import { tuning } from '../../src/data/tuning';
import { createNewClub } from '../../src/domain/club';
import { Game, type GameEvent } from '../../src/domain/game';
import type { Guest } from '../../src/domain/guests/guest';
import { createRng } from '../../src/domain/rng';
import { assignBartender, inBouncerArea, setBouncerPost, switchRole } from '../../src/domain/staff';
import { LocalSaveRepository, MemoryStore, SAVE_KEY } from '../../src/persistence/localSaveRepository';

const T0 = 50_000_000;

/** A game with spawning off, so tests control exactly who is in the club. */
function quietGame(bouncerPost?: { col: number; row: number }) {
  let s = createNewClub(0);
  if (bouncerPost) {
    const r = switchRole(s, s.staff[0].id);
    if (!r.ok) throw new Error(r.reason);
    const p = setBouncerPost(r.state, s.staff[0].id, bouncerPost);
    if (!p.ok) throw new Error(p.reason);
    s = p.state;
  }
  const game = new Game(s, createRng(9));
  game.sim.spawnEnabled = false;
  const events: GameEvent[] = [];
  game.on((e) => events.push(e));
  return { game, events };
}

function troublemaker(game: Game, now: number): Guest {
  const g = game.sim.spawn(game.state, now);
  g.troublemaker = true;
  g.troubleAt = now;
  return g;
}

function run(game: Game, from: number, ms: number, until?: () => boolean): number {
  let t = from;
  for (; t < from + ms; t += 50) {
    game.tick(t);
    if (until?.()) break;
  }
  return t;
}

describe('bouncer staff rules', () => {
  it('switching a bartender to bouncer frees the bar and posts them inside the door', () => {
    const s = createNewClub(0);
    const r = switchRole(s, s.staff[0].id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.staff[0]).toMatchObject({ role: 'bouncer', barId: null, post: { col: 6, row: 2 } });
    const back = switchRole(r.state, s.staff[0].id);
    expect(back.ok && back.state.staff[0]).toMatchObject({ role: 'bartender', post: null });
  });

  it('posts must be inside the club and only bouncers have one', () => {
    const s = createNewClub(0);
    expect(setBouncerPost(s, s.staff[0].id, { col: 1, row: 1 }).ok).toBe(false); // bartender
    const b = switchRole(s, s.staff[0].id);
    if (!b.ok) throw new Error();
    expect(setBouncerPost(b.state, s.staff[0].id, { col: 99, row: 1 }).ok).toBe(false);
    expect(setBouncerPost(b.state, s.staff[0].id, { col: 2, row: 7 }).ok).toBe(true);
  });

  it('a bouncer cannot be assigned to a bar', () => {
    const s = createNewClub(0);
    const bar = s.furniture.find((f) => f.catalogId === 'bar_basic')!;
    const b = switchRole(s, s.staff[0].id);
    if (!b.ok) throw new Error();
    expect(assignBartender(b.state, s.staff[0].id, bar.id).ok).toBe(false);
  });

  it('coverage is a square of tiles around the post', () => {
    expect(inBouncerArea({ col: 5, row: 5 }, 8.5, 2.5, 3)).toBe(true);
    expect(inBouncerArea({ col: 5, row: 5 }, 9.5, 5.5, 3)).toBe(false);
  });
});

describe('troublemakers', () => {
  it('without a bouncer they upset nearby guests, then storm out and cost popularity', () => {
    const { game, events } = quietGame();
    const pop0 = game.state.popularity;
    const g = troublemaker(game, T0);
    const bystander = game.sim.spawn(game.state, T0);
    bystander.troublemaker = false;
    let t = run(game, T0, 2000, () => g.state === 'TROUBLEMAKER');
    expect(g.state).toBe('TROUBLEMAKER');
    expect(events.some((e) => e.type === 'troubleStarted' && !e.covered)).toBe(true);
    // keep the bystander pinned next to the troublemaker
    const h0 = bystander.happiness;
    bystander.x = g.x;
    bystander.y = g.y;
    game.tick((t += 50));
    game.tick((t += 1000));
    expect(bystander.happiness).toBeLessThan(h0);
    // Take the bystander out so only the troublemaker's own penalty is measured.
    game.sim.guests = game.sim.guests.filter((x) => x !== bystander);
    run(game, t, tuning.troubleMaxMs + 20_000, () => !game.sim.guests.includes(g));
    expect(game.sim.guests.includes(g)).toBe(false);
    expect(events.some((e) => e.type === 'troubleUnresolved')).toBe(true);
    expect(game.state.popularity).toBe(pop0 - tuning.troublePopularityPenalty);
    expect(game.sim.illegalTransitions).toBe(0);
  });

  it('a bouncer whose area covers them throws them out automatically, with no penalty', () => {
    const { game, events } = quietGame({ col: 6, row: 2 });
    const pop0 = game.state.popularity;
    const g = troublemaker(game, T0);
    run(game, T0, 30_000, () => !game.sim.guests.includes(g));
    expect(g.escorted).toBe(true);
    expect(events.some((e) => e.type === 'bounced' && e.guestId === g.id)).toBe(true);
    expect(events.some((e) => e.type === 'troubleUnresolved')).toBe(false);
    expect(game.state.popularity).toBe(pop0);
    expect(game.sim.illegalTransitions).toBe(0);
  });

  it('Send Bouncer works anywhere, once per cooldown', () => {
    const { game } = quietGame({ col: 0, row: 9 }); // far corner, nowhere near the door
    const a = troublemaker(game, T0);
    const b = troublemaker(game, T0);
    const t = run(game, T0, 2000, () => a.state === 'TROUBLEMAKER' && b.state === 'TROUBLEMAKER');
    expect(game.sendBouncer(a.id, t).ok).toBe(true);
    expect(a.escorted).toBe(true);
    expect(game.sendBouncer(b.id, t + 10).ok).toBe(false); // busy escorting
    expect(game.sendBouncer(b.id, t + tuning.bouncerCooldownMs + 10).ok).toBe(true);
  });

  it('Send Bouncer is refused with no bouncer or for an ordinary guest', () => {
    const { game } = quietGame();
    const g = game.sim.spawn(game.state, T0);
    g.troublemaker = false;
    expect(game.sendBouncer(g.id, T0).ok).toBe(false);
  });
});

describe('v2 -> v3 migration', () => {
  it('gives every existing worker an empty post', () => {
    const { celebrityWall: _w, celebrity: _c, ...rest } = createNewClub(0);
    const v2 = { ...rest, schemaVersion: 2, staff: [{ id: 's1', role: 'bartender', name: 'Rico', barId: null }] };
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, JSON.stringify(v2));
    const r = new LocalSaveRepository(store).load();
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.state.staff[0]).toEqual({ id: 's1', role: 'bartender', name: 'Rico', barId: null, post: null });
  });
});
