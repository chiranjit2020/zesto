import type { Diet, Recipe } from './types';
import { INGREDIENT_BY_ID } from '../data/catalog';

/**
 * Weekly planner (§25). Greedy, deterministic, ingredient-reuse aware — generates a 7-day
 * plan under a budget, then aggregates a de-duplicated shopping list. Modelled on the book's
 * own "Weekly Budget Planning Examples" (₹500 / ₹1000 / ₹1500 a week).
 */

export interface PlanInput {
  weeklyBudgetInr: number;
  people: number;
  diet: Diet;
  maxEffort: 'very-low' | 'low' | 'medium' | 'high';
  slots: ('breakfast' | 'lunch' | 'dinner')[];
  pantry: string[];
}

export interface PlannedMeal {
  day: string;
  slot: string;
  recipe: Recipe;
  costInr: number;
}

export interface WeekPlan {
  meals: PlannedMeal[];
  totalCostInr: number;
  perDayInr: number;
  shoppingList: ShoppingLine[];
  withinBudget: boolean;
  note: string;
}

export interface ShoppingLine {
  ingredientId: string;
  name: string;
  category: string;
  recipeCount: number;
  alreadyHave: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EFFORT_RANK = { 'very-low': 0, low: 1, medium: 2, high: 3 } as const;

export function generateWeekPlan(recipes: Recipe[], input: PlanInput): WeekPlan {
  const pantry = new Set(input.pantry);
  let pool = recipes.filter((r) => EFFORT_RANK[r.effort.level] <= EFFORT_RANK[input.maxEffort]);
  if (input.diet === 'vegetarian') pool = pool.filter((r) => !r.tags.includes('diet:egg'));

  const slotPool = (slot: string) =>
    pool.filter((r) => {
      if (slot === 'breakfast') return r.mealType === 'breakfast' || r.mealType === 'any';
      return r.mealType === 'main' || r.mealType === 'any';
    });

  const meals: PlannedMeal[] = [];
  const usedNumbers = new Set<number>();
  const boughtIngredients = new Set<string>(input.pantry);
  let total = 0;

  const targetPerMeal = input.weeklyBudgetInr / (DAYS.length * input.slots.length);

  for (const day of DAYS) {
    for (const slot of input.slots) {
      const candidates = slotPool(slot)
        .map((r) => {
          const cost = r.costInr * input.people;
          // reward: ingredient reuse (already bought this week / in pantry) + cheapness
          const reuse =
            r.keyIngredients.filter((id) => boughtIngredients.has(id)).length /
            Math.max(r.keyIngredients.length, 1);
          const budgetPenalty = Math.max(0, cost - targetPerMeal) / Math.max(targetPerMeal, 1);
          const repeatPenalty = usedNumbers.has(r.number) ? 1.5 : 0;
          const score = reuse * 1.2 - budgetPenalty * 0.8 - repeatPenalty - r.effort.score * 0.3;
          return { r, cost, score };
        })
        .sort((a, b) => b.score - a.score);

      const pick = candidates[0];
      if (!pick) continue;
      meals.push({ day, slot, recipe: pick.r, costInr: Math.round(pick.cost) });
      total += pick.cost;
      usedNumbers.add(pick.r.number);
      pick.r.keyIngredients.forEach((id) => boughtIngredients.add(id));
    }
  }

  // ---- aggregate shopping list ----
  const counts = new Map<string, number>();
  for (const m of meals) {
    for (const id of m.recipe.keyIngredients) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const shoppingList: ShoppingLine[] = [...counts.entries()]
    .map(([id, count]) => {
      const ing = INGREDIENT_BY_ID.get(id);
      return {
        ingredientId: id,
        name: ing?.name ?? id,
        category: ing?.category ?? 'other',
        recipeCount: count,
        alreadyHave: pantry.has(id),
      };
    })
    .sort((a, b) => Number(a.alreadyHave) - Number(b.alreadyHave) || b.recipeCount - a.recipeCount);

  const within = total <= input.weeklyBudgetInr;
  return {
    meals,
    totalCostInr: Math.round(total),
    perDayInr: Math.round(total / DAYS.length),
    shoppingList,
    withinBudget: within,
    note: within
      ? `Comes in around ₹${Math.round(total)} — about ₹${Math.round(total / DAYS.length)} a day. Rice, dal and roti do most of the lifting.`
      : `This plan lands near ₹${Math.round(total)}, a little over ₹${input.weeklyBudgetInr}. Drop a snack slot or lean on the cheapest recipes to close the gap.`,
  };
}
