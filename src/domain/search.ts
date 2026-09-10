import type { EquipmentId, MealType, Recipe } from './types';

/** Faceted browse/search for Discover (§3, §31). Pure, works fully offline. */

export interface RecipeFilters {
  query: string;
  maxCostInr: number | null;
  maxTimeMinutes: number | null;
  equipment: EquipmentId[]; // recipe must be doable with ONLY these (empty = any)
  diet: 'vegetarian' | 'egg' | 'any';
  calorieBand: [number, number] | null;
  mealType: MealType | 'any';
  chapters: string[];
  highProtein: boolean;
  usesLeftovers: boolean;
  noCook: boolean;
  sort: 'relevance' | 'cost' | 'time' | 'calories' | 'effort';
}

export const EMPTY_FILTERS: RecipeFilters = {
  query: '',
  maxCostInr: null,
  maxTimeMinutes: null,
  equipment: [],
  diet: 'any',
  calorieBand: null,
  mealType: 'any',
  chapters: [],
  highProtein: false,
  usesLeftovers: false,
  noCook: false,
  sort: 'relevance',
};

function matchesQuery(r: Recipe, q: string): number {
  if (!q) return 0.5;
  const needle = q.toLowerCase().trim();
  const words = needle.split(/\s+/);
  const hay = [
    r.title,
    r.tagline,
    r.chapter,
    r.whyYoullLoveIt,
    ...r.ingredients.map((i) => i.name),
    ...r.tags,
  ]
    .join(' ')
    .toLowerCase();
  let hits = 0;
  for (const w of words) {
    if (r.title.toLowerCase().includes(w)) hits += 2;
    else if (hay.includes(w)) hits += 1;
  }
  return hits === 0 ? -1 : Math.min(hits / (words.length * 2), 1);
}

function equipmentOk(r: Recipe, allowed: EquipmentId[]): boolean {
  if (allowed.length === 0) return true;
  const set = new Set(allowed);
  if (set.has('one-pan')) set.add('tawa');
  if (set.has('rice-cooker')) set.add('one-pot');
  return r.equipment.every((e) => e === 'no-cook' || set.has(e));
}

export function filterRecipes(recipes: Recipe[], f: RecipeFilters): Recipe[] {
  const out: { r: Recipe; q: number }[] = [];

  for (const r of recipes) {
    const q = matchesQuery(r, f.query);
    if (q < 0) continue;
    if (f.diet === 'vegetarian' && r.tags.includes('diet:egg')) continue;
    if (f.diet === 'egg' && !r.tags.includes('diet:egg')) continue;
    if (f.maxCostInr != null && r.costInr > f.maxCostInr) continue;
    if (f.maxTimeMinutes != null && r.timeMinutes > f.maxTimeMinutes) continue;
    if (f.noCook && !r.equipment.includes('no-cook')) continue;
    if (!equipmentOk(r, f.equipment)) continue;
    if (f.mealType !== 'any' && r.mealType !== f.mealType && r.mealType !== 'any') continue;
    if (f.chapters.length && !f.chapters.includes(r.chapter)) continue;
    if (f.usesLeftovers && !r.tags.includes('uses-leftovers')) continue;
    if (f.highProtein && r.nutrition.proteinG < 12) continue;
    if (f.calorieBand) {
      const [lo, hi] = f.calorieBand;
      if (r.nutrition.calories < lo || r.nutrition.calories > hi) continue;
    }
    out.push({ r, q });
  }

  const sorters: Record<RecipeFilters['sort'], (a: { r: Recipe; q: number }, b: { r: Recipe; q: number }) => number> = {
    relevance: (a, b) => b.q - a.q || a.r.costInr - b.r.costInr,
    cost: (a, b) => a.r.costInr - b.r.costInr,
    time: (a, b) => a.r.timeMinutes - b.r.timeMinutes,
    calories: (a, b) => a.r.nutrition.calories - b.r.nutrition.calories,
    effort: (a, b) => a.r.effort.score - b.r.effort.score,
  };
  out.sort(sorters[f.sort]);
  return out.map((o) => o.r);
}

export function activeFilterCount(f: RecipeFilters): number {
  let n = 0;
  if (f.maxCostInr != null) n++;
  if (f.maxTimeMinutes != null) n++;
  if (f.equipment.length) n++;
  if (f.diet !== 'any') n++;
  if (f.calorieBand) n++;
  if (f.mealType !== 'any') n++;
  if (f.chapters.length) n++;
  if (f.highProtein) n++;
  if (f.usesLeftovers) n++;
  if (f.noCook) n++;
  return n;
}
