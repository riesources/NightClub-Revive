import { appearanceFromSeed } from '../../data/appearanceCatalog';
import { getFurnitureDef } from '../../data/furnitureCatalog';
import { tuning } from '../../data/tuning';
import { CELEB_SPEND_EVERY_MS, getCelebrity } from '../../data/celebrities';
import { chargeCover, serveDrink } from '../bar';
import { celebrityPhase, finishCelebrityVisit } from '../celebrity';
import { getParty } from '../../data/parties';
import { finishParty, partyActive } from '../party';
import { creditIncome } from '../progression';
import { adjustPopularity, clone, computeLuxury, guestCapacity } from '../club';
import { isPlaying } from '../dj';
import { adjacentWalkableCells, blockedCells, cellKey, entranceCell, inBounds, instanceCells } from '../grid';
import { findPath } from '../pathfinding/astar';
import { pickOne, type Rng } from '../rng';
import { bartenderForBar, bartenderModeEffect, inBouncerArea } from '../staff';
import { GENRES, type ClubState, type GridPoint } from '../types';
import { TRANSITIONS, WALKING_STATES, guestCell, type Guest, type GuestState } from './guest';

/** The simulation talks to the outside world only through this port. */
export interface SimHost {
  getState(): ClubState;
  commit(next: ClubState): void;
  emit(event: SimEvent): void;
}

export type SimEvent =
  | { type: 'sale'; guestId: string; paid: number; tip: number; x: number; y: number }
  | { type: 'cover'; guestId: string; paid: number; x: number; y: number }
  | { type: 'levelUp'; level: number; reward: number }
  | { type: 'outOfDrinks' }
  | { type: 'noBartender' }
  | { type: 'guestLeft'; guestId: string; happy: boolean }
  | { type: 'troubleStarted'; guestId: string; covered: boolean }
  | { type: 'bounced'; guestId: string; staffId: string; x: number; y: number }
  | { type: 'troubleUnresolved'; guestId: string }
  | { type: 'celebArrived'; celebId: string; guestId: string }
  | { type: 'celebLeft'; celebId: string; bonus: number }
  | { type: 'partyEnded'; success: boolean; rewardCash: number; rewardPopularity: number };

interface WorldCache {
  state: ClubState;
  blocked: Set<string>;
  danceCells: GridPoint[];
  seats: { id: string; cells: GridPoint[] }[];
  staffedBars: { id: string; cells: GridPoint[] }[];
  luxury: number;
}

const FIRST = ['Alex', 'Bree', 'Cass', 'Dani', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jade', 'Kip', 'Lia', 'Milo', 'Nia', 'Oz', 'Pia', 'Quin', 'Rae', 'Sol', 'Tex', 'Uma', 'Vic', 'Wren', 'Yuki', 'Zed'];
const LAST = ['Vance', 'Okafor', 'Reyes', 'Lindqvist', 'Moreau', 'Tanaka', 'Novak', 'Haddad', 'Quinn', 'Silva', 'Brandt', 'Kowal', 'Achebe', 'Duval', 'Ferro'];

/** PROPOSED: fictional generated guest names. */
export function guestName(seed: number): string {
  return `${FIRST[seed % FIRST.length]} ${LAST[Math.floor(seed / FIRST.length) % LAST.length]}`;
}

export class GuestSimulation {
  guests: Guest[] = [];
  readonly queues = new Map<string, string[]>();
  private nextServeAt = new Map<string, number>();
  private nextSpawnAt = 0;
  private lastUpdate: number | null = null;
  private counter = 0;
  private cache: WorldCache | null = null;
  /** Count of illegal transitions attempted (should stay 0; surfaced in debug + tests). */
  illegalTransitions = 0;
  spawnEnabled = true;
  /** Bouncer staff id -> time they are free again after an escort. */
  readonly bouncerBusyUntil = new Map<string, number>();
  private celebGuestId: string | null = null;
  private nextCelebSpendAt = 0;

  constructor(private readonly rng: Rng) {}

  private world(state: ClubState): WorldCache {
    if (this.cache?.state === state) return this.cache;
    const blocked = blockedCells(state);
    const danceCells: GridPoint[] = [];
    const seats: WorldCache['seats'] = [];
    const staffedBars: WorldCache['staffedBars'] = [];
    for (const f of state.furniture) {
      const def = getFurnitureDef(f.catalogId);
      if (!def) continue;
      if (def.kind === 'dancefloor') danceCells.push(...instanceCells(f));
      else if (def.kind === 'seat') seats.push({ id: f.id, cells: adjacentWalkableCells(state, f, blocked) });
      else if (def.kind === 'bar' && bartenderForBar(state, f.id)) staffedBars.push({ id: f.id, cells: adjacentWalkableCells(state, f, blocked) });
    }
    this.cache = { state, blocked, danceCells, seats, staffedBars, luxury: computeLuxury(state) };
    return this.cache;
  }

  private setState(g: Guest, next: GuestState, now: number): void {
    if (!TRANSITIONS[g.state].includes(next)) this.illegalTransitions++;
    g.state = next;
    g.stateSince = now;
    g.lastProgressAt = now;
  }

  spawn(state: ClubState, now: number): Guest {
    const e = entranceCell(state.room);
    const seed = Math.floor(this.rng() * 1e9);
    const g: Guest = {
      id: `g${++this.counter}`,
      name: guestName(seed),
      spent: 0,
      tipRate: Math.round((tuning.tipRateMin + this.rng() * (tuning.tipRateMax - tuning.tipRateMin)) * 100) / 100,
      guestClass: 'Regular',
      troublemaker: this.rng() < tuning.troublemakerChance,
      troubleAt: now + tuning.troubleStartMinMs + this.rng() * (tuning.troubleStartMaxMs - tuning.troubleStartMinMs),
      escorted: false,
      troubleUnresolved: false,
      seed,
      appearance: appearanceFromSeed(seed),
      prefGenre: pickOne(this.rng, GENRES)!,
      x: e.col + 0.5,
      y: e.row + 0.5,
      path: [],
      goal: null,
      state: 'ENTERING',
      stateSince: now,
      activityEndsAt: 0,
      happiness: tuning.guestBaseHappiness,
      thirst: this.rng() * 50,
      visitEndsAt: now + tuning.guestVisitMinMs + this.rng() * (tuning.guestVisitMaxMs - tuning.guestVisitMinMs),
      barId: null,
      queuedAt: 0,
      patienceDeadline: 0,
      order: null,
      lastProgressAt: now,
      failedGoals: 0,
      seatId: null,
    };
    const w = this.world(state);
    const inside = { col: e.col, row: e.row + 1 };
    if (!this.walkTo(g, w, state, inside)) g.path = [];
    this.guests.push(g);
    return g;
  }

  private walkTo(g: Guest, w: WorldCache, state: ClubState, goal: GridPoint): boolean {
    const path = findPath(state.room, w.blocked, guestCell(g), goal);
    if (!path) return false;
    g.path = path;
    g.goal = goal;
    return true;
  }

  private spawnInterval(state: ClubState, now: number): number {
    const popFactor = 200 / (200 + state.popularity);
    const music = isPlaying(state, now) ? 1 : 2.5;
    const rush = partyActive(state, now) ? (getParty(state.party!.id)?.rush ?? 1) : 1;
    return Math.max(tuning.guestMinSpawnIntervalMs / rush, (tuning.guestSpawnIntervalMs * popFactor * music) / rush);
  }

  update(host: SimHost, now: number): void {
    const dtMs = this.lastUpdate === null ? 0 : Math.min(Math.max(0, now - this.lastUpdate), tuning.maxSimStepMs);
    this.lastUpdate = now;
    const dt = dtMs / 1000;
    let state = host.getState();

    if (this.spawnEnabled && now >= this.nextSpawnAt && this.guests.length < guestCapacity(state)) {
      const g = this.spawn(state, now);
      const cover = chargeCover(state, now);
      g.spent += cover.paid;
      host.commit(cover.state);
      state = cover.state;
      host.emit({ type: 'cover', guestId: g.id, paid: cover.paid, x: g.x, y: g.y });
      if (cover.leveledUp) host.emit({ type: 'levelUp', level: cover.state.level, reward: cover.reward });
      this.nextSpawnAt = now + this.spawnInterval(state, now) * (0.6 + this.rng() * 0.8);
    }

    const playing = isPlaying(state, now);
    const departed: Guest[] = [];
    for (const g of this.guests) {
      const w = this.world(state);
      this.updateNeeds(g, dt, playing, state.dj.genre);
      if (WALKING_STATES.has(g.state)) this.advanceWalk(g, w, state, dt, now);
      if (g.state === 'LEAVING' && (g.path.length === 0 || now - g.lastProgressAt > tuning.guestStuckTimeoutMs)) {
        departed.push(g);
        continue;
      }
      this.think(g, w, state, now, host);
    }

    state = this.updateCelebrity(host, now);
    const ended = finishParty(state, now);
    if (ended) {
      host.commit(ended.state);
      state = ended.state;
      host.emit({ type: 'partyEnded', success: ended.success, rewardCash: ended.rewardCash, rewardPopularity: ended.rewardPopularity });
      if (ended.leveledUp) host.emit({ type: 'levelUp', level: ended.level, reward: 0 });
    }
    this.applyTrouble(dt);
    this.runBouncers(host, state, now);
    state = this.serveBars(host, now);

    if (departed.length) {
      const draft = clone(state);
      for (const g of departed) {
        const happy = g.happiness >= tuning.happyThreshold && !g.escorted && !g.troubleUnresolved;
        if (g.guestClass === 'Celebrity') {
          // Popularity for a VIP visit is granted by finishCelebrityVisit.
        } else if (g.troubleUnresolved) {
          adjustPopularity(draft, -tuning.troublePopularityPenalty);
          host.emit({ type: 'troubleUnresolved', guestId: g.id });
        } else if (g.escorted) {
          // Thrown out: no effect on popularity either way.
        } else if (happy) adjustPopularity(draft, tuning.popularityGainPerHappyGuest);
        else if (g.happiness < tuning.unhappyThreshold) adjustPopularity(draft, -tuning.popularityLossPerUnhappyGuest);
        draft.stats.guestsVisited += 1;
        this.removeFromQueue(g);
        host.emit({ type: 'guestLeft', guestId: g.id, happy });
      }
      const gone = new Set(departed.map((g) => g.id));
      this.guests = this.guests.filter((g) => !gone.has(g.id));
      host.commit(draft);
    }
  }

  /**
   * Celebrity lifecycle, driven by the booking's absolute timestamps:
   * arrive at the door, spend every CELEB_SPEND_EVERY_MS, cheer up nearby
   * guests, then leave and close the visit exactly once.
   */
  private updateCelebrity(host: SimHost, now: number): ClubState {
    let state = host.getState();
    const phase = celebrityPhase(state, now);
    const g = this.celebGuestId ? this.guests.find((x) => x.id === this.celebGuestId) : undefined;
    if (!g) this.celebGuestId = null;
    if (phase === 'here') {
      const c = getCelebrity(state.celebrity!.id)!;
      if (!g) {
        const v = this.spawn(state, now);
        Object.assign(v, {
          name: c.name,
          appearance: c.look,
          guestClass: 'Celebrity',
          troublemaker: false,
          happiness: 100,
          thirst: 0,
          visitEndsAt: state.celebrity!.leavesAt,
        });
        this.celebGuestId = v.id;
        this.nextCelebSpendAt = now + CELEB_SPEND_EVERY_MS;
        host.emit({ type: 'celebArrived', celebId: c.id, guestId: v.id });
      } else if (now >= this.nextCelebSpendAt && g.state !== 'LEAVING') {
        this.nextCelebSpendAt = now + CELEB_SPEND_EVERY_MS;
        const draft = clone(state);
        const { leveledUp, reward } = creditIncome(draft, c.spendPerTick);
        g.spent += c.spendPerTick;
        host.commit(draft);
        state = draft;
        host.emit({ type: 'sale', guestId: g.id, paid: c.spendPerTick, tip: 0, x: g.x, y: g.y });
        if (leveledUp) host.emit({ type: 'levelUp', level: draft.level, reward });
      }
      // Star power: guests near the VIP have a better time (PROPOSED).
      const vip = g;
      if (vip) for (const o of this.guests) if (o !== vip && o.state !== 'TROUBLEMAKER' && Math.max(Math.abs(o.x - vip.x), Math.abs(o.y - vip.y)) <= 3) o.happiness = Math.min(100, o.happiness + 0.05);
    } else if (phase === 'done') {
      if (g && g.state !== 'LEAVING') this.leave(g, this.world(state), state, now);
      const c = getCelebrity(state.celebrity!.id)!;
      const r = finishCelebrityVisit(state, now);
      if (r.ok) {
        host.commit(r.state);
        state = r.state;
        host.emit({ type: 'celebLeft', celebId: c.id, bonus: c.popularityBonus });
      }
    }
    return state;
  }

  private updateNeeds(g: Guest, dt: number, playing: boolean, genre: string): void {
    if (g.guestClass === 'Celebrity') return; // VIPs are always having a great time
    if (g.state !== 'DRINKING') g.thirst = Math.min(100, g.thirst + tuning.thirstPerSec * dt);
    let drift = 0;
    if (g.state === 'DANCING') drift = playing ? tuning.danceHappinessPerSec + (g.prefGenre === genre ? 0.6 : 0) : tuning.noMusicHappinessPerSec;
    else if (g.state === 'SITTING_OR_SOCIALIZING') drift = 0.3;
    else if (g.state === 'QUEUING_FOR_BAR') drift = -0.3;
    else if (!playing) drift = -0.4;
    g.happiness = Math.max(0, Math.min(100, g.happiness + drift * dt));
  }

  private advanceWalk(g: Guest, w: WorldCache, state: ClubState, dt: number, now: number): void {
    let budget = tuning.guestWalkSpeed * dt;
    while (budget > 0 && g.path.length) {
      const next = g.path[0];
      if (w.blocked.has(cellKey(next.col, next.row)) || !inBounds(state.room, next)) {
        // Furniture appeared on the path (or room changed): replan, else give up on this goal.
        if (!(g.goal && this.walkTo(g, w, state, g.goal))) this.onPathFailed(g, w, state, now);
        return;
      }
      const tx = next.col + 0.5;
      const ty = next.row + 0.5;
      const dx = tx - g.x;
      const dy = ty - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= budget) {
        g.x = tx;
        g.y = ty;
        budget -= dist;
        g.path.shift();
        g.lastProgressAt = now;
      } else {
        g.x += (dx / dist) * budget;
        g.y += (dy / dist) * budget;
        budget = 0;
      }
    }
    if (g.path.length && now - g.lastProgressAt > tuning.guestStuckTimeoutMs) this.onPathFailed(g, w, state, now);
  }

  private onPathFailed(g: Guest, w: WorldCache, state: ClubState, now: number): void {
    g.path = [];
    g.failedGoals += 1;
    if (g.state === 'LEAVING') {
      // Safe despawn: update() removes leaving guests with no path.
      g.lastProgressAt = now - tuning.guestStuckTimeoutMs - 1;
      return;
    }
    if (g.failedGoals >= 3) this.leave(g, w, state, now);
    else this.setState(g, 'CHOOSING_ACTIVITY', now);
  }

  private leave(g: Guest, w: WorldCache, state: ClubState, now: number): void {
    this.removeFromQueue(g);
    this.setState(g, 'LEAVING', now);
    if (!this.walkTo(g, w, state, entranceCell(state.room))) g.path = [];
  }

  private removeFromQueue(g: Guest): void {
    if (!g.barId) return;
    const q = this.queues.get(g.barId);
    if (q) {
      const i = q.indexOf(g.id);
      if (i >= 0) q.splice(i, 1);
    }
    g.barId = null;
    g.order = null;
  }

  private think(g: Guest, w: WorldCache, state: ClubState, now: number, host: SimHost): void {
    const arrived = g.path.length === 0;
    if (g.state === 'TROUBLEMAKER') {
      if (now - g.stateSince > tuning.troubleMaxMs) {
        g.troubleUnresolved = true;
        this.leave(g, w, state, now);
      } else if (arrived && !this.wander(g, w, state)) {
        g.troubleUnresolved = true;
        this.leave(g, w, state, now);
      }
      return;
    }
    if (
      g.troublemaker &&
      now >= g.troubleAt &&
      ['CHOOSING_ACTIVITY', 'DANCING', 'SITTING_OR_SOCIALIZING', 'DRINKING', 'WALKING_TO_DANCE_FLOOR', 'SEEKING_SEAT'].includes(g.state)
    ) {
      this.removeFromQueue(g);
      this.setState(g, 'TROUBLEMAKER', now);
      g.seatId = null;
      if (!this.wander(g, w, state)) g.path = [];
      host.emit({ type: 'troubleStarted', guestId: g.id, covered: this.coveringBouncer(state, g, now) !== null });
      return;
    }
    if (g.state !== 'LEAVING' && (now >= g.visitEndsAt || g.happiness <= 5)) {
      this.leave(g, w, state, now);
      return;
    }
    switch (g.state) {
      case 'ENTERING':
        if (arrived) this.setState(g, 'CHOOSING_ACTIVITY', now);
        break;
      case 'CHOOSING_ACTIVITY':
        this.chooseActivity(g, w, state, now, host);
        break;
      case 'WALKING_TO_DANCE_FLOOR':
        if (arrived) {
          this.setState(g, 'DANCING', now);
          g.activityEndsAt = now + 15_000 + this.rng() * 20_000;
        }
        break;
      case 'SEEKING_SEAT':
        if (arrived) {
          this.setState(g, 'SITTING_OR_SOCIALIZING', now);
          g.activityEndsAt = now + 10_000 + this.rng() * 15_000;
        }
        break;
      case 'THIRSTY':
        if (arrived) {
          const bar = g.barId;
          if (!bar || !w.staffedBars.some((b) => b.id === bar)) {
            this.removeFromQueue(g);
            this.setState(g, 'CHOOSING_ACTIVITY', now);
            break;
          }
          this.setState(g, 'QUEUING_FOR_BAR', now);
          g.queuedAt = now;
          g.patienceDeadline = now + tuning.guestBasePatienceMs;
          g.order = { id: `${g.id}-o${now}`, status: 'pending' };
          const q = this.queues.get(bar) ?? [];
          q.push(g.id);
          this.queues.set(bar, q);
        }
        break;
      case 'QUEUING_FOR_BAR':
        if (now > g.patienceDeadline || !w.staffedBars.some((b) => b.id === g.barId)) {
          this.removeFromQueue(g);
          g.happiness = Math.max(0, g.happiness - tuning.noDrinkPenalty);
          g.thirst = 60;
          this.setState(g, 'CHOOSING_ACTIVITY', now);
        }
        break;
      case 'DANCING':
      case 'SITTING_OR_SOCIALIZING':
        if (g.thirst >= 100) this.goToBar(g, w, state, now, host);
        else if (now >= g.activityEndsAt) this.setState(g, 'CHOOSING_ACTIVITY', now);
        break;
      case 'DRINKING':
        if (now >= g.activityEndsAt) this.setState(g, 'CHOOSING_ACTIVITY', now);
        break;
      case 'LEAVING':
        break;
    }
  }

  private chooseActivity(g: Guest, w: WorldCache, state: ClubState, now: number, host: SimHost): void {
    g.seatId = null;
    if (g.thirst >= 100) {
      this.goToBar(g, w, state, now, host);
      return;
    }
    const playing = isPlaying(state, now);
    const r = this.rng();
    const danceWeight = playing ? 0.65 : 0.15;
    if (r < danceWeight && w.danceCells.length) {
      const target = this.leastBusy(w.danceCells);
      if (target && this.walkTo(g, w, state, target)) {
        this.setState(g, 'WALKING_TO_DANCE_FLOOR', now);
        return;
      }
    }
    const seat = pickOne(this.rng, w.seats.filter((s) => s.cells.length));
    if (seat && r < danceWeight + 0.25) {
      const target = pickOne(this.rng, seat.cells)!;
      if (this.walkTo(g, w, state, target)) {
        g.seatId = seat.id;
        this.setState(g, 'SEEKING_SEAT', now);
        return;
      }
    }
    // Socialize: wander to a random free floor cell.
    for (let tries = 0; tries < 6; tries++) {
      const target = { col: Math.floor(this.rng() * state.room.cols), row: Math.floor(this.rng() * (state.room.rows - 2)) };
      if (this.walkTo(g, w, state, target)) {
        this.setState(g, 'SEEKING_SEAT', now);
        return;
      }
    }
    this.onPathFailed(g, w, state, now);
  }

  private leastBusy(cells: GridPoint[]): GridPoint | undefined {
    const load = new Map<string, number>();
    for (const o of this.guests) {
      const t = o.goal ?? guestCell(o);
      const k = cellKey(t.col, t.row);
      load.set(k, (load.get(k) ?? 0) + 1);
    }
    let min = Infinity;
    for (const c of cells) min = Math.min(min, load.get(cellKey(c.col, c.row)) ?? 0);
    return pickOne(this.rng, cells.filter((c) => (load.get(cellKey(c.col, c.row)) ?? 0) === min));
  }

  goToBar(g: Guest, w: WorldCache, state: ClubState, now: number, host: SimHost): void {
    const here = guestCell(g);
    const options = w.staffedBars
      .flatMap((b) => b.cells.map((c) => ({ bar: b.id, c, d: Math.abs(c.col - here.col) + Math.abs(c.row - here.row) })))
      .sort((a, b) => a.d - b.d);
    for (const o of options.slice(0, 6)) {
      if (this.walkTo(g, w, state, o.c)) {
        g.barId = o.bar;
        this.setState(g, 'THIRSTY', now);
        return;
      }
    }
    // No staffed, reachable bar: the guest is disappointed and carries on.
    host.emit({ type: 'noBartender' });
    g.happiness = Math.max(0, g.happiness - tuning.noDrinkPenalty / 2);
    g.thirst = 50;
    if (g.state !== 'CHOOSING_ACTIVITY') this.setState(g, 'CHOOSING_ACTIVITY', now);
  }

  private serveBars(host: SimHost, now: number): ClubState {
    let state = host.getState();
    for (const [barId, queue] of this.queues) {
      if (!queue.length || !bartenderForBar(state, barId)) continue;
      const g = this.guests.find((x) => x.id === queue[0]);
      if (!g || g.state !== 'QUEUING_FOR_BAR' || !g.order) {
        queue.shift();
        continue;
      }
      const fx = bartenderModeEffect(bartenderForBar(state, barId)!.mode);
      if (now < Math.max(this.nextServeAt.get(barId) ?? 0, g.queuedAt + fx.serveMs)) continue;
      const luxury = this.world(state).luxury;
      const res = serveDrink(state, g.order, g.happiness, luxury, g.tipRate, fx.tipMultiplier);
      queue.shift();
      g.barId = null;
      g.order = null;
      if (res.ok) {
        host.commit(res.state);
        state = res.state;
        g.spent += res.paid;
        host.emit({ type: 'sale', guestId: g.id, paid: res.paid, tip: res.tip, x: g.x, y: g.y });
        if (res.leveledUp) host.emit({ type: 'levelUp', level: res.state.level, reward: res.reward });
        g.thirst = 0;
        g.happiness = Math.min(100, g.happiness + 8);
        this.setState(g, 'DRINKING', now);
        g.activityEndsAt = now + tuning.drinkDurationMs;
        this.nextServeAt.set(barId, now + fx.serveMs);
      } else {
        host.emit({ type: 'outOfDrinks' });
        g.happiness = Math.max(0, g.happiness - tuning.noDrinkPenalty);
        g.thirst = 60;
        this.setState(g, 'CHOOSING_ACTIVITY', now);
        this.nextServeAt.set(barId, now + 300);
      }
    }
    return state;
  }

  /** Troublemakers roam the club looking for someone to bother. */
  private wander(g: Guest, w: WorldCache, state: ClubState): boolean {
    for (let tries = 0; tries < 6; tries++) {
      const target = { col: Math.floor(this.rng() * state.room.cols), row: 1 + Math.floor(this.rng() * (state.room.rows - 1)) };
      if (this.walkTo(g, w, state, target)) return true;
    }
    return false;
  }

  /** Guests near a troublemaker lose happiness (PROPOSED). */
  private applyTrouble(dt: number): void {
    const trouble = this.guests.filter((g) => g.state === 'TROUBLEMAKER');
    if (!trouble.length || dt <= 0) return;
    for (const g of this.guests) {
      if (g.state === 'TROUBLEMAKER' || g.state === 'LEAVING') continue;
      if (trouble.some((t) => Math.max(Math.abs(t.x - g.x), Math.abs(t.y - g.y)) <= tuning.troubleRadius)) {
        g.happiness = Math.max(0, g.happiness - tuning.troubleHappinessPerSec * dt);
      }
    }
  }

  private freeBouncers(state: ClubState, now: number) {
    return state.staff.filter((s) => s.role === 'bouncer' && s.post && (this.bouncerBusyUntil.get(s.id) ?? 0) <= now);
  }

  /** A free bouncer whose area covers this guest, if any. */
  private coveringBouncer(state: ClubState, g: Guest, now: number) {
    return this.freeBouncers(state, now).find((b) => inBouncerArea(b.post!, g.x, g.y, tuning.bouncerRadius)) ?? null;
  }

  /** Gamezebo: "Your bouncer will handle the situation automatically within their area." */
  private runBouncers(host: SimHost, state: ClubState, now: number): void {
    for (const g of this.guests) {
      if (g.state !== 'TROUBLEMAKER') continue;
      const b = this.coveringBouncer(state, g, now);
      if (b) this.eject(host, state, g, b.id, now);
    }
  }

  private eject(host: SimHost, state: ClubState, g: Guest, staffId: string, now: number): void {
    g.escorted = true;
    this.bouncerBusyUntil.set(staffId, now + tuning.bouncerCooldownMs);
    host.emit({ type: 'bounced', guestId: g.id, staffId, x: g.x, y: g.y });
    this.leave(g, this.world(state), state, now);
  }

  /**
   * Manual: send any free bouncer at a troublemaker anywhere in the club
   * (GameYum: the target icon sends the bouncer to a jerk).
   */
  sendBouncer(host: SimHost, guestId: string, now: number): { ok: true } | { ok: false; reason: string } {
    const state = host.getState();
    const g = this.guests.find((x) => x.id === guestId);
    if (!g || g.state !== 'TROUBLEMAKER') return { ok: false, reason: "That guest isn't causing trouble" };
    if (!state.staff.some((s) => s.role === 'bouncer')) return { ok: false, reason: 'Hire or switch a worker to Bouncer first' };
    const b = this.freeBouncers(state, now)[0];
    if (!b) return { ok: false, reason: 'Your bouncers are busy - try again in a moment' };
    this.eject(host, state, g, b.id, now);
    return { ok: true };
  }

  /** Drop the Bass: send every free guest to the bar (Gamezebo: "make your guests go to the bar"). */
  dropTheBass(host: SimHost, now: number): number {
    const state = host.getState();
    const w = this.world(state);
    let sent = 0;
    for (const g of this.guests) {
      if (['DANCING', 'SITTING_OR_SOCIALIZING', 'CHOOSING_ACTIVITY', 'WALKING_TO_DANCE_FLOOR', 'SEEKING_SEAT'].includes(g.state)) {
        g.thirst = 100;
        this.goToBar(g, w, state, now, host);
        if (g.state === 'THIRSTY') sent++;
      }
    }
    return sent;
  }

  /** Dedicate Song: boost one guest's happiness (Gamezebo: targets any guest). */
  dedicate(guestId: string): boolean {
    const g = this.guests.find((x) => x.id === guestId);
    if (!g || g.state === 'LEAVING') return false;
    g.happiness = Math.min(100, g.happiness + tuning.dedicateHappinessBoost);
    return true;
  }

  /** Remove all guests (used on reset / load). */
  clear(): void {
    this.guests = [];
    this.queues.clear();
    this.nextServeAt.clear();
    this.bouncerBusyUntil.clear();
    this.celebGuestId = null;
    this.cache = null;
    this.lastUpdate = null;
  }
}
