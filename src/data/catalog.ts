import raw from './recipes.json';
import ingredientsRaw from './ingredients.json';
import { computeEffort } from '../domain/effort';
import type { EquipmentId, Ingredient, MealType, Recipe } from '../domain/types';

/**
 * Loads the committed seed (the CONTENT FOUNDATION) and derives fields the engine needs.
 * This is the only place the raw JSON shape is known; everything downstream uses `Recipe`.
 * Growing 99 → 5,000+ recipes is "more rows here" — no code changes.
 */

interface RawRecipe {
  number: number;
  title: string;
  slug: string;
  tagline: string;
  chapter: string;
  meal_type: string;
  time_text: string;
  time_minutes: number | null;
  needs_precooked_base: boolean;
  headline_cost_inr: number;
  estimated_cost_inr: number;
  serves: number;
  equipment_text: string;
  equipment: string[];
  level: string;
  why_youll_love_it: string;
  ingredients: {
    raw: string;
    name: string;
    quantity: number | null;
    unit: string | null;
    optional: boolean;
    canonical: string[];
  }[];
  steps: string[];
  money_hack: string;
  swap_it: string | null;
  cost_breakdown_text: string;
  cost_breakdown_items: { item: string; cost_inr: number }[];
  closing_line: string;
  tags: string[];
  nutrition: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fibre_g: number;
    basis: string;
    confidence: string;
  };
  key_ingredients: string[];
  staple_ingredients: string[];
}

const rawData = raw as { meta: Record<string, unknown>; recipes: RawRecipe[] };

function toRecipe(r: RawRecipe): Recipe {
  const timeMinutes = r.time_minutes ?? 10;
  const effort = computeEffort({
    steps: r.steps,
    equipment: r.equipment as EquipmentId[],
    ingredientCount: r.ingredients.filter((i) => !i.optional).length,
    timeMinutes,
    level: (r.level === 'Easy' ? 'Easy' : 'Beginner') as 'Beginner' | 'Easy',
    needsPrecookedBase: r.needs_precooked_base,
  });

  return {
    number: r.number,
    title: r.title,
    slug: r.slug,
    tagline: r.tagline,
    chapter: r.chapter,
    mealType: (r.meal_type as MealType) ?? 'any',
    timeText: r.time_text,
    timeMinutes,
    needsPrecookedBase: r.needs_precooked_base,
    headlineCostInr: r.headline_cost_inr,
    costInr: r.estimated_cost_inr ?? r.headline_cost_inr,
    serves: r.serves || 1,
    equipmentText: r.equipment_text,
    equipment: r.equipment as EquipmentId[],
    level: (r.level === 'Easy' ? 'Easy' : 'Beginner') as 'Beginner' | 'Easy',
    whyYoullLoveIt: r.why_youll_love_it,
    ingredients: r.ingredients,
    steps: r.steps,
    moneyHack: r.money_hack,
    swapIt: r.swap_it,
    costBreakdownText: r.cost_breakdown_text,
    costBreakdownItems: r.cost_breakdown_items.map((i) => ({ item: i.item, costInr: i.cost_inr })),
    closingLine: r.closing_line,
    tags: r.tags,
    nutrition: {
      calories: r.nutrition.calories,
      proteinG: r.nutrition.protein_g,
      carbsG: r.nutrition.carbs_g,
      fatG: r.nutrition.fat_g,
      fibreG: r.nutrition.fibre_g,
      basis: r.nutrition.basis === 'sourced' ? 'sourced' : 'heuristic-estimate',
      confidence: (r.nutrition.confidence as 'low' | 'medium' | 'high') ?? 'low',
    },
    keyIngredients: r.key_ingredients,
    stapleIngredients: r.staple_ingredients,
    effort: { score: effort.score, level: effort.level, signals: effort.signals },
    cleanupVessels: effort.cleanupVessels,
    quiet: effort.quiet,
  };
}

export const RECIPES: Recipe[] = rawData.recipes.map(toRecipe);

export const RECIPE_BY_NUMBER = new Map(RECIPES.map((r) => [r.number, r]));
export const RECIPE_BY_SLUG = new Map(RECIPES.map((r) => [r.slug, r]));

export const INGREDIENTS: Ingredient[] = (
  ingredientsRaw as {
    categories: string[];
    ingredients: {
      id: string;
      name: string;
      category: string;
      is_staple: boolean;
      shelf_life_days: number | null;
      used_in_count: number;
    }[];
  }
).ingredients.map((i) => ({
  id: i.id,
  name: i.name,
  category: i.category as Ingredient['category'],
  isStaple: i.is_staple,
  shelfLifeDays: i.shelf_life_days,
  usedInCount: i.used_in_count,
}));

export const INGREDIENT_BY_ID = new Map(INGREDIENTS.map((i) => [i.id, i]));

/** staple ids are auto-added to any pantry context — you're assumed to have salt & oil */
export const STAPLE_IDS = INGREDIENTS.filter((i) => i.isStaple).map((i) => i.id);
export const NON_STAPLE_INGREDIENTS = INGREDIENTS.filter((i) => !i.isStaple);

export const CURATED_LISTS = rawData.meta.curated_lists as Record<string, number[]>;
export const CATALOG_META = rawData.meta;

/** recipes that use a given canonical ingredient as a key (non-staple) ingredient */
export function recipesUsingIngredient(id: string): Recipe[] {
  return RECIPES.filter((r) => r.keyIngredients.includes(id));
}

export function recipesForList(listKey: string): Recipe[] {
  const nums = CURATED_LISTS[listKey] ?? [];
  return nums.map((n) => RECIPE_BY_NUMBER.get(n)).filter((r): r is Recipe => !!r);
}
