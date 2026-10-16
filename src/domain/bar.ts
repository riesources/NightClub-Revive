import { tuning } from '../data/tuning';
import { clone } from './club';
import { creditIncome } from './progression';
import { fail, ok, type ClubState, type Result } from './types';

/** Restock: CONFIRMED +100 drinks per refill (Gamezebo). Cost and cap PROPOSED. */
export function refillDrinks(state: ClubState): Result {
  if (state.stock.drinks >= tuning.barStockCapacity) return fail('Drink supply is full');
  if (state.cash < tuning.barRefillCost) return fail('Not enough cash to restock');
  const draft = clone(state);
  draft.cash -= tuning.barRefillCost;
  draft.stock.drinks = Math.min(tuning.barStockCapacity, draft.stock.drinks + tuning.barRefillAmount);
  return ok(draft);
}

/** A single drink order. Status guards against double-charging or double-decrementing. */
export interface DrinkOrder {
  id: string;
  status: 'pending' | 'served' | 'failed';
}

/** PROPOSED tip: scales with happiness (0-100) and the club's luxury. */
export function tipFor(happiness: number, luxury: number): number {
  const h = Math.max(0, Math.min(100, happiness)) / 100;
  return Math.floor(tuning.baseTipMax * h * (1 + luxury * tuning.luxuryTipFactor));
}

export type ServeResult = { ok: true; state: ClubState; paid: number; tip: number; leveledUp: boolean } | { ok: false; reason: string };

/**
 * Serve one drink for an order. Exactly once per order: stock -1, cash += price + tip.
 * The order object is marked so a repeated call is rejected.
 */
export function serveDrink(state: ClubState, order: DrinkOrder, happiness: number, luxury: number): ServeResult {
  if (order.status !== 'pending') return { ok: false, reason: 'Order already processed' };
  if (state.stock.drinks <= 0) {
    order.status = 'failed';
    return { ok: false, reason: 'Out of drinks' };
  }
  const draft = clone(state);
  draft.stock.drinks -= 1;
  const tip = tipFor(happiness, luxury);
  const paid = tuning.drinkPrice + tip;
  const { leveledUp } = creditIncome(draft, paid);
  draft.stats.drinksSold += 1;
  draft.stats.tipsEarned += tip;
  order.status = 'served';
  return { ok: true, state: draft, paid, tip, leveledUp };
}
