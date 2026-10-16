import { getFurnitureDef } from '../data/furnitureCatalog';
import { tuning } from '../data/tuning';
import { clone } from './club';
import { creditIncome } from './progression';
import { fail, ok, type ClubState, type Result } from './types';

/** Drink capacity: base plus each placed drink tank (GameYum: tanks raise capacity). */
export function stockCapacity(state: ClubState): number {
  const tanks = state.furniture.filter((f) => getFurnitureDef(f.catalogId)?.kind === 'tank').length;
  return tuning.barStockCapacity + tanks * tuning.barTankCapacity;
}

/** Restock: CONFIRMED +100 drinks per refill (Gamezebo). Cost and cap PROPOSED. */
export function refillDrinks(state: ClubState): Result {
  const cap = stockCapacity(state);
  if (state.stock.drinks >= cap) return fail('Drink supply is full');
  if (state.cash < tuning.barRefillCost) return fail('Not enough cash to restock');
  const draft = clone(state);
  draft.cash -= tuning.barRefillCost;
  draft.stock.drinks = Math.min(cap, draft.stock.drinks + tuning.barRefillAmount);
  return ok(draft);
}

/** A single drink order. Status guards against double-charging or double-decrementing. */
export interface DrinkOrder {
  id: string;
  status: 'pending' | 'served' | 'failed';
}

/** PROPOSED tip: drink price x the guest's tip rate, scaled by happiness (0-100) and luxury. */
export function tipFor(happiness: number, luxury: number, tipRate = 0.15): number {
  const h = Math.max(0, Math.min(100, happiness)) / 60;
  return Math.round(tuning.drinkPrice * tipRate * h * (1 + luxury * tuning.luxuryTipFactor));
}

/** Cover charge at the door: $5 base CONFIRMED, popularity scaling PROPOSED. */
export function coverCharge(popularity: number): number {
  return tuning.coverChargeBase + Math.floor(popularity * tuning.coverChargePerPopularity);
}

export function chargeCover(state: ClubState): { state: ClubState; paid: number; leveledUp: boolean; reward: number } {
  const draft = clone(state);
  const paid = coverCharge(state.popularity);
  const { leveledUp, reward } = creditIncome(draft, paid);
  return { state: draft, paid, leveledUp, reward };
}

export type ServeResult = { ok: true; state: ClubState; paid: number; tip: number; leveledUp: boolean; reward: number } | { ok: false; reason: string };

/**
 * Serve one drink for an order. Exactly once per order: stock -1, cash += price + tip.
 * The order object is marked so a repeated call is rejected.
 */
export function serveDrink(state: ClubState, order: DrinkOrder, happiness: number, luxury: number, tipRate = 0.15, tipMultiplier = 1): ServeResult {
  if (order.status !== 'pending') return { ok: false, reason: 'Order already processed' };
  if (state.stock.drinks <= 0) {
    order.status = 'failed';
    return { ok: false, reason: 'Out of drinks' };
  }
  const draft = clone(state);
  draft.stock.drinks -= 1;
  const tip = Math.round(tipFor(happiness, luxury, tipRate) * tipMultiplier);
  const paid = tuning.drinkPrice + tip;
  const { leveledUp, reward } = creditIncome(draft, paid);
  draft.stats.drinksSold += 1;
  draft.stats.tipsEarned += tip;
  order.status = 'served';
  return { ok: true, state: draft, paid, tip, leveledUp, reward };
}
