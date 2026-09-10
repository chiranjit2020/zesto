import type { Recipe } from './types';

/**
 * Cost engine (§12). Prices are ESTIMATES, never guarantees. The book itself distinguishes
 * package price from the portion actually consumed; we surface the itemised breakdown and
 * always label the number as estimated.
 */

export interface CostView {
  estimateInr: number;
  headlineInr: number;
  perServingInr: number;
  items: { item: string; costInr: number }[];
  /** the book's headline and its own breakdown disagree — show the range honestly */
  hasRange: boolean;
  rangeLabel: string | null;
  disclaimer: string;
}

export function costView(recipe: Recipe, servings = recipe.serves): CostView {
  const scale = servings / recipe.serves;
  const estimate = Math.round(recipe.costInr * scale);
  const headline = Math.round(recipe.headlineCostInr * scale);
  const lo = Math.min(estimate, headline);
  const hi = Math.max(estimate, headline);
  const hasRange = hi - lo >= 3;

  return {
    estimateInr: estimate,
    headlineInr: headline,
    perServingInr: Math.round(recipe.costInr * scale / servings),
    items: recipe.costBreakdownItems.map((i) => ({ ...i, costInr: Math.round(i.costInr * scale) })),
    hasRange,
    rangeLabel: hasRange ? `₹${lo}–₹${hi}` : null,
    disclaimer:
      'Estimated from the portion of each ingredient used — not the shelf price. Real cost moves with your city, shop and season.',
  };
}

/** Money saved vs a typical delivery order (used by the dashboard, §15). */
export const TYPICAL_DELIVERY_MEAL_INR = 180;
export const TYPICAL_DELIVERY_FEES_INR = 55;

export function estimatedSaving(homeCookedInr: number): number {
  return Math.max(0, TYPICAL_DELIVERY_MEAL_INR + TYPICAL_DELIVERY_FEES_INR - homeCookedInr);
}
