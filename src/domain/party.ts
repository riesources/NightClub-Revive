import { getParty } from '../data/parties';
import { adjustPopularity, clone } from './club';
import { creditIncome } from './progression';
import { fail, ok, type ClubState, type Result } from './types';

/** Throw a party: one at a time, level-gated, paid up front; starts immediately. */
export function startParty(state: ClubState, partyId: string, now: number): Result {
  const p = getParty(partyId);
  if (!p) return fail('Unknown party');
  if (state.party) return fail('A party is already running');
  if (state.level < p.requiredLevel) return fail(`Unlocks at level ${p.requiredLevel}`);
  if (state.cash < p.cost) return fail('Not enough cash');
  const draft = clone(state);
  draft.cash -= p.cost;
  draft.party = { id: p.id, startsAt: now, endsAt: now + p.durationMs, guests: 0 };
  return ok(draft);
}

export function partyActive(state: ClubState, now: number): boolean {
  return !!state.party && now < state.party.endsAt;
}

/** Count an arriving guest toward the running party's goal. Mutates the draft. */
export function countPartyGuest(draft: ClubState, now: number): void {
  if (draft.party && now < draft.party.endsAt) draft.party.guests += 1;
}

export type PartyOutcome = { state: ClubState; success: boolean; rewardCash: number; rewardPopularity: number; leveledUp: boolean; level: number };

/**
 * Close a finished party exactly once: if the goal was met, pays the rewards
 * and adds it to the history; either way the party is cleared.
 */
export function finishParty(state: ClubState, now: number): PartyOutcome | null {
  const run = state.party;
  if (!run || now < run.endsAt) return null;
  const p = getParty(run.id)!;
  const draft = clone(state);
  const success = run.guests >= p.goalGuests;
  let leveledUp = false;
  if (success) {
    leveledUp = creditIncome(draft, p.rewardCash).leveledUp;
    adjustPopularity(draft, p.rewardPopularity);
    draft.partyHistory[p.id] = (draft.partyHistory[p.id] ?? 0) + 1;
  }
  draft.party = null;
  return { state: draft, success, rewardCash: success ? p.rewardCash : 0, rewardPopularity: success ? p.rewardPopularity : 0, leveledUp, level: draft.level };
}
