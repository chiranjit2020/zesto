import type { MealHistoryEntry } from './types';
import type { IconName } from '../components/ui/Icon';
import { RECIPE_BY_NUMBER } from '../data/catalog';

/** Subtle, useful gamification (§34) — not a children's game. */
export interface Challenge {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  target: number;
  window: 'week' | 'all';
  test: (h: MealHistoryEntry) => boolean;
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'thirty-dinner',
    icon: 'mode-broke',
    title: '₹30 Dinner Challenge',
    description: 'Cook 3 meals for ₹30 or less',
    target: 3,
    window: 'week',
    test: (h) => {
      const r = RECIPE_BY_NUMBER.get(h.recipeNumber);
      return (h.actualCostInr ?? r?.costInr ?? 999) <= 30;
    },
  },
  {
    id: 'no-delivery',
    icon: 'ban',
    title: '5-Day No-Delivery',
    description: 'Replace 5 delivery orders with home cooking',
    target: 5,
    window: 'week',
    test: (h) => h.deliveryAvoided,
  },
  {
    id: 'three-ingredient',
    icon: 'hash',
    title: '3-Ingredient Challenge',
    description: 'Cook 2 recipes with 3 or fewer key ingredients',
    target: 2,
    window: 'week',
    test: (h) => (RECIPE_BY_NUMBER.get(h.recipeNumber)?.keyIngredients.length ?? 9) <= 3,
  },
  {
    id: 'leftover-hero',
    icon: 'mode-leftovers',
    title: 'Leftover Hero',
    description: 'Rescue 3 leftovers into new meals',
    target: 3,
    window: 'all',
    test: (h) => h.wasLeftoverRescue,
  },
];

export function challengeProgress(c: Challenge, history: MealHistoryEntry[], now = Date.now()) {
  const scope =
    c.window === 'week'
      ? history.filter((h) => new Date(h.cookedAt).getTime() >= now - 7 * 86400000)
      : history;
  const current = scope.filter(c.test).length;
  return { current: Math.min(current, c.target), done: current >= c.target };
}
