import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MealHistoryEntry } from '../domain/types';
import { RECIPE_BY_NUMBER } from '../data/catalog';
import { estimatedSaving } from '../domain/cost';
export { recentlyCookedNumbers } from '../domain/kitchenHistory';

interface KitchenStore {
  history: MealHistoryEntry[];
  favorites: number[];
  logCook: (entry: Omit<MealHistoryEntry, 'id' | 'cookedAt'> & { cookedAt?: string }) => void;
  removeHistory: (id: string) => void;
  toggleFavorite: (recipeNumber: number) => void;
  isFavorite: (recipeNumber: number) => boolean;
  clear: () => void;
}

const uid = () => `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const useKitchen = create<KitchenStore>()(
  persist(
    (set, get) => ({
      history: [],
      favorites: [],
      logCook: (entry) =>
        set((s) => ({
          history: [
            { id: uid(), cookedAt: entry.cookedAt ?? new Date().toISOString(), ...entry },
            ...s.history,
          ].slice(0, 400),
        })),
      removeHistory: (id) => set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      toggleFavorite: (n) =>
        set((s) => ({
          favorites: s.favorites.includes(n)
            ? s.favorites.filter((x) => x !== n)
            : [n, ...s.favorites],
        })),
      isFavorite: (n) => get().favorites.includes(n),
      clear: () => set({ history: [], favorites: [] }),
    }),
    { name: 'zesto.kitchen.v1' },
  ),
);

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

export function cookingStreakDays(history: MealHistoryEntry[], now = Date.now()): number {
  if (history.length === 0) return 0;
  const days = new Set(history.map((h) => new Date(h.cookedAt).toISOString().slice(0, 10)));
  let streak = 0;
  for (let d = 0; d < 400; d++) {
    const key = new Date(now - d * 86400000).toISOString().slice(0, 10);
    if (days.has(key)) streak += 1;
    else if (d > 0) break;
  }
  return streak;
}

