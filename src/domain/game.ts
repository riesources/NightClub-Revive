import type { AvatarAppearance } from '../data/appearanceCatalog';
import { isValidAppearance } from '../data/appearanceCatalog';
import { refillDrinks } from './bar';
import { CLUB_NAME_MAX, clone, cleanClubName } from './club';
import { getCelebrity } from '../data/celebrities';
import * as dj from './dj';
import { buyAndPlace, moveFurniture, sellFurniture } from './economy';
import { GuestSimulation, type SimEvent, type SimHost } from './guests/simulation';
import { createRng, type Rng } from './rng';
import { bookCelebrity } from './celebrity';
import { startParty } from './party';
import { assignBartender, hireBartender, setBartenderMode, setBouncerPost, switchRole } from './staff';
import type { ClubState, Facing, Genre, GridPoint, Result } from './types';

export type GameEvent = SimEvent | { type: 'stateChanged' } | { type: 'notice'; message: string; tone: 'info' | 'error' | 'good' };

type Listener = (e: GameEvent) => void;

/**
 * The single command boundary between UI/renderer and the domain. Every
 * mutation goes through a pure domain function; the renderer only reads
 * `state` and `sim.guests`.
 */
export class Game implements SimHost {
  private _state: ClubState;
  readonly sim: GuestSimulation;
  private listeners = new Set<Listener>();

  constructor(state: ClubState, rng: Rng = createRng(Date.now() & 0xffffffff)) {
    this._state = state;
    this.sim = new GuestSimulation(rng);
  }

  get state(): ClubState {
    return this._state;
  }

  getState(): ClubState {
    return this._state;
  }

  commit(next: ClubState): void {
    this._state = next;
    this.emit({ type: 'stateChanged' });
  }

  emit(e: GameEvent): void {
    for (const l of this.listeners) l(e);
  }

  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private apply(r: Result, success?: string): Result {
    if (r.ok) {
      this.commit(r.state);
      if (success) this.emit({ type: 'notice', message: success, tone: 'good' });
    } else {
      this.emit({ type: 'notice', message: r.reason, tone: 'error' });
    }
    return r;
  }

  /** Replace the whole state (load/reset). Guests are transient and are cleared. */
  replaceState(next: ClubState): void {
    this.sim.clear();
    this.commit(next);
  }

  tick(now: number): void {
    this.sim.update(this, now);
  }

  buy(catalogId: string, col: number, row: number, facing: Facing = 0) {
    return this.apply(buyAndPlace(this._state, catalogId, col, row, facing));
  }
  move(id: string, col: number, row: number, facing?: Facing) {
    return this.apply(moveFurniture(this._state, id, col, row, facing));
  }
  sell(id: string) {
    return this.apply(sellFurniture(this._state, id), 'Item sold');
  }
  refill() {
    return this.apply(refillDrinks(this._state), 'Drinks restocked');
  }
  hireBartender() {
    return this.apply(hireBartender(this._state), 'Bartender hired');
  }
  assignBartender(staffId: string, barId: string | null) {
    return this.apply(assignBartender(this._state, staffId, barId));
  }
  startParty(partyId: string, now = Date.now()) {
    return this.apply(startParty(this._state, partyId, now), "Let's get this party started!");
  }
  bookCelebrity(celebId: string, now = Date.now()) {
    return this.apply(bookCelebrity(this._state, celebId, now), 'Booked! Your guest of honour is on the way.');
  }
  setBartenderMode(staffId: string, mode: 'speed' | 'tricks') {
    return this.apply(setBartenderMode(this._state, staffId, mode));
  }
  switchRole(staffId: string) {
    return this.apply(switchRole(this._state, staffId));
  }
  setBouncerPost(staffId: string, post: GridPoint) {
    return this.apply(setBouncerPost(this._state, staffId, post), 'Bouncer moved');
  }
  sendBouncer(guestId: string, now = Date.now()) {
    const r = this.sim.sendBouncer(this, guestId, now);
    if (!r.ok) this.emit({ type: 'notice', message: r.reason, tone: 'error' });
    return r;
  }
  startSet(genre: Genre, now = Date.now()) {
    return this.apply(dj.startSet(this._state, genre, now), 'The set has started!');
  }
  changeGenre(genre: Genre) {
    return this.apply(dj.changeGenre(this._state, genre));
  }
  dropTheBass(now = Date.now()) {
    const r = dj.dropTheBass(this._state, now);
    if (!r.ok) return this.apply(r);
    this.commit(r.state);
    const sent = this.sim.dropTheBass(this, now);
    this.emit({ type: 'notice', message: `Bass dropped! ${sent} guests head to the bar`, tone: 'good' });
    return r;
  }
  dedicateSong(guestId: string, now = Date.now()) {
    const r = dj.dedicateSong(this._state, now);
    if (!r.ok) return this.apply(r);
    if (!this.sim.dedicate(guestId)) {
      this.emit({ type: 'notice', message: 'That guest is not available', tone: 'error' });
      return r;
    }
    this.commit(r.state);
    this.emit({ type: 'notice', message: 'Song dedicated - they love it!', tone: 'good' });
    return r;
  }
  saveAppearance(a: AvatarAppearance) {
    if (!isValidAppearance(a)) return this.apply({ ok: false, reason: 'Invalid appearance' });
    const draft = clone(this._state);
    draft.appearance = { ...a };
    return this.apply({ ok: true, state: draft }, 'Look saved');
  }
  renameClub(name: string) {
    const n = cleanClubName(name);
    if (!n) return this.apply({ ok: false, reason: `Club names are 1 to ${CLUB_NAME_MAX} characters` });
    const draft = clone(this._state);
    draft.clubName = n;
    return this.apply({ ok: true, state: draft });
  }
  toggleCelebWish(celebId: string) {
    if (!getCelebrity(celebId)) return this.apply({ ok: false, reason: 'Unknown celebrity' });
    const draft = clone(this._state);
    draft.celebWishes = draft.celebWishes.includes(celebId) ? draft.celebWishes.filter((x) => x !== celebId) : [...draft.celebWishes, celebId];
    return this.apply({ ok: true, state: draft });
  }
  dismissTutorial() {
    const draft = clone(this._state);
    draft.tutorialDismissed = true;
    this.commit(draft);
  }
}
