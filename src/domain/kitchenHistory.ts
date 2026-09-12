import type { MealHistoryEntry } from './types.js';
import { RECIPE_BY_NUMBER } from '../data/catalog.js';
import { estimatedSaving } from './cost.js';

/**
 * Pure meal-history helpers — split out of `src/state/kitchen.ts` (which re-exports
 * them unchanged for existing callers) for the same reason as `src/domain/pantry.ts`:
 * needs to be importable from `api/` without dragging in the zustand store, which
 * touches `localStorage` at module load and would crash under Node. `computeWeekStats`
 * moved here in Phase 8, specifically so `api/_lib/weeklySummary.ts` can call the same
 * function the Profile page already uses (spec §21: "the exact metrics should come
 * from existing Zesto data" — not a second, server-side reimplementation of it).
 */
export function recentlyCookedNumbers(history: MealHistoryEntry[], days = 3, now = Date.now()): number[] {
  const cutoff = now - days * 86400000;
  return history.filter((h) => new Date(h.cookedAt).getTime() >= cutoff).map((h) => h.recipeNumber);
}

export interface WeekStats {
  mealsCooked: number;
  estCalories: number;
  moneySpentInr: number;
  avgMealInr: number;
  leftoversRescued: number;
  deliveryAvoided: number;
  estimatedSavedInr: number;
  under30Count: number;
  insights: string[];
}

export function computeWeekStats(history: MealHistoryEntry[], now = Date.now()): WeekStats {
  const weekAgo = now - 7 * 86400000;
  const wk = history.filter((h) => new Date(h.cookedAt).getTime() >= weekAgo);

  let calories = 0;
  let money = 0;
  let under30 = 0;
  for (const h of wk) {
    const r = RECIPE_BY_NUMBER.get(h.recipeNumber);
    const cost = h.actualCostInr ?? (r ? r.costInr * h.servings : 0);
    money += cost;
    if (r) calories += r.nutrition.calories * h.servings;
    if (cost <= 30) under30 += 1;
  }
  const leftovers = wk.filter((h) => h.wasLeftoverRescue).length;
  const delivery = wk.filter((h) => h.deliveryAvoided).length;
  const avg = wk.length ? money / wk.length : 0;
  const saved = wk.reduce((acc, h) => {
    const r = RECIPE_BY_NUMBER.get(h.recipeNumber);
    const cost = h.actualCostInr ?? (r ? r.costInr * h.servings : 0);
    return acc + (h.deliveryAvoided ? estimatedSaving(cost) : 0);
  }, 0);

  const insights: string[] = [];
  if (under30 >= 2) insights.push(`You cooked ${under30} meals for ₹30 or less this week.`);
  if (leftovers >= 1) insights.push(`You rescued ${leftovers} leftover ${leftovers === 1 ? 'ingredient' : 'ingredients'}.`);
  if (delivery >= 3) insights.push(`You skipped delivery ${delivery} times — roughly ₹${Math.round(saved)} saved.`);
  if (wk.length >= 5) insights.push(`${wk.length} home-cooked meals. That adds up.`);
  if (insights.length === 0 && wk.length > 0) insights.push(`A good start — ${wk.length} cooked so far.`);

  return {
    mealsCooked: wk.length,
    estCalories: Math.round(calories),
    moneySpentInr: Math.round(money),
    avgMealInr: Math.round(avg * 100) / 100,
    leftoversRescued: leftovers,
    deliveryAvoided: delivery,
    estimatedSavedInr: Math.round(saved),
    under30Count: under30,
    insights,
  };
}
