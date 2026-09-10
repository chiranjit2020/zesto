import type {
  DecisionContext,
  EquipmentId,
  Recipe,
  ScoredRecipe,
} from './types';
import { effortRank } from './effort';

/**
 * The Zesto Decision Engine (§9, §10).
 *
 *   score(recipe, ctx) = Σ wᵢ · fᵢ(recipe, ctx)     fᵢ ∈ [0, 1]
 *
 * Deterministic and transparent — NOT an opaque model. Every weight is in one object so the
 * engine can be tuned or swapped for a learned model without touching callers. Every result
 * carries `reasons[]` derived from the same factors so the UI never re-computes "why".
 */

export const WEIGHTS = {
  ingredientMatch: 0.34,
  budgetFit: 0.18,
  timeFit: 0.12,
  effortFit: 0.12,
  equipmentFit: 0.1,
  nutritionFit: 0.06,
  dietFit: 0.04,
  leftoverBoost: 0.03,
  history: 0.01,
} as const;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** equipment the user has "unlocked" — owning a pan implies you can also do no-cook, etc. */
function equipmentSatisfied(recipe: Recipe, available: EquipmentId[]): boolean {
  if (available.length === 0) return true;
  const has = new Set<EquipmentId>(available);
  if (has.has('one-pan')) has.add('tawa');
  if (has.has('rice-cooker')) has.add('one-pot');
  // no-cook recipes are satisfied by literally anything
  return recipe.equipment.every((e) => e === 'no-cook' || has.has(e));
}

function ingredientMatch(recipe: Recipe, pantry: Set<string>) {
  const required = recipe.ingredients.filter(
    (i) => !i.optional && i.canonical.length > 0 && !recipe.stapleIngredients.includes(i.canonical[0]),
  );
  const optional = recipe.ingredients.filter(
    (i) => i.optional && i.canonical.length > 0,
  );

  const have: string[] = [];
  const missing: string[] = [];
  const missingOptional: string[] = [];

  let got = 0;
  const keyIds = recipe.keyIngredients;
  for (const id of keyIds) {
    if (pantry.has(id)) {
      got += 1;
      have.push(id);
    } else {
      missing.push(id);
    }
  }
  for (const o of optional) {
    const id = o.canonical[0];
    if (!pantry.has(id) && !keyIds.includes(id)) missingOptional.push(id);
  }

  const denom = keyIds.length || 1;
  // optional ingredients present are a small bonus, absent are not punished
  const optionalBonus =
    optional.length > 0
      ? (optional.filter((o) => pantry.has(o.canonical[0])).length / optional.length) * 0.1
      : 0;

  const base = keyIds.length === 0 ? 0.7 : got / denom;
  return {
    value: clamp01(base + optionalBonus),
    have,
    missing,
    missingOptional,
    got,
    total: keyIds.length,
    required: required.length,
  };
}

function ramp(value: number, ideal: number, zeroAt: number) {
  // 1 at/under ideal, linearly to 0 by zeroAt
  if (value <= ideal) return 1;
  if (value >= zeroAt) return 0;
  return 1 - (value - ideal) / (zeroAt - ideal);
}

export function scoreRecipe(recipe: Recipe, ctx: DecisionContext): ScoredRecipe {
  const pantry = new Set(ctx.pantry);
  const f: Record<string, number> = {};
  const reasons: string[] = [];

  const im = ingredientMatch(recipe, pantry);
  f.ingredientMatch = im.value;

  f.budgetFit =
    ctx.budgetInr == null ? 0.6 : ramp(recipe.costInr, ctx.budgetInr, ctx.budgetInr * 2);

  f.timeFit =
    ctx.timeMinutes == null
      ? 0.6
      : ramp(recipe.timeMinutes, ctx.timeMinutes, ctx.timeMinutes + 12);

  f.effortFit =
    ctx.maxEffort == null
      ? 0.6
      : clamp01(1 - Math.max(0, effortRank(recipe.effort.level) - effortRank(ctx.maxEffort)) / 3);

  f.equipmentFit = equipmentSatisfied(recipe, ctx.equipmentAvailable ?? []) ? 1 : 0;

  if (ctx.calorieBand) {
    const [lo, hi] = ctx.calorieBand;
    const k = recipe.nutrition.calories;
    f.nutritionFit = k >= lo && k <= hi ? 1 : ramp(Math.min(Math.abs(k - lo), Math.abs(k - hi)), 0, 250);
  } else {
    f.nutritionFit = 0.6;
  }

  const isEgg = recipe.tags.includes('diet:egg');
  f.dietFit = ctx.diet === 'vegetarian' && isEgg ? 0 : 1;

  const leftoverHit = ctx.leftoverIngredients.some(
    (id) => recipe.keyIngredients.includes(id) || recipe.tags.includes('uses-leftovers'),
  );
  f.leftoverBoost = leftoverHit ? 1 : 0;

  const cookedRecently = ctx.recentlyCookedNumbers.includes(recipe.number);
  const likedHit = recipe.tags.some((t) => ctx.likedTags.includes(t));
  f.history = clamp01((likedHit ? 0.7 : 0.4) - (cookedRecently ? 0.5 : 0));

  let score = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    score += WEIGHTS[key] * (f[key] ?? 0);
  }

  // hard gates fold to a near-zero score so they sink but stay inspectable
  if (f.dietFit === 0) score *= 0.05;
  if (f.equipmentFit === 0) score *= 0.15;
  if (ctx.noCookOnly && !recipe.equipment.includes('no-cook')) score *= 0.02;
  // an explicit calorie band is a soft filter — out-of-band recipes sink but stay visible
  if (ctx.calorieBand) {
    const [lo, hi] = ctx.calorieBand;
    if (recipe.nutrition.calories < lo || recipe.nutrition.calories > hi) score *= 0.35;
  }
  // the book's own curated pick for this mood gets a gentle nudge, not a free pass
  const isCuratedPick = ctx.preferredNumbers?.includes(recipe.number) ?? false;
  if (isCuratedPick) score = clamp01(score * 1.12 + 0.04);

  // ---- reasons, most compelling first ----
  if (im.total > 0 && im.got === im.total) {
    reasons.push(`You already have everything for this`);
  } else if (im.got >= 1 && im.total > 0) {
    reasons.push(`You already have ${im.got}/${im.total} ingredients`);
  }
  if (ctx.budgetInr != null && recipe.costInr <= ctx.budgetInr) {
    const under = ctx.budgetInr - recipe.costInr;
    reasons.push(under >= 5 ? `₹${under} under your ₹${ctx.budgetInr} budget` : `Fits your ₹${ctx.budgetInr} budget`);
  }
  if (ctx.timeMinutes != null && recipe.timeMinutes <= ctx.timeMinutes) {
    reasons.push(`Ready in ${recipe.timeMinutes} min`);
  }
  if (ctx.maxEffort != null && effortRank(recipe.effort.level) <= effortRank(ctx.maxEffort)) {
    reasons.push(recipe.effort.level === 'very-low' ? `Almost no effort` : `${recipe.effort.level} effort`);
  }
  if (leftoverHit) reasons.push(`Uses up a leftover you flagged`);
  if (ctx.calorieBand && f.nutritionFit === 1) {
    reasons.push(`~${recipe.nutrition.calories} kcal (estimated) — in your range`);
  }
  if (isCuratedPick && reasons.length < 2) {
    reasons.push(`A book favourite for this`);
  }
  if (reasons.length === 0) {
    reasons.push(`A solid match for what you asked`);
  }

  return {
    recipe,
    score: clamp01(score),
    factors: f,
    reasons: reasons.slice(0, 3),
    haveIngredients: im.have,
    missingIngredients: im.missing,
    missingOptional: im.missingOptional,
  };
}

export interface RankOptions {
  limit?: number;
  minScore?: number;
}

export function rankRecipes(
  recipes: Recipe[],
  ctx: DecisionContext,
  opts: RankOptions = {},
): ScoredRecipe[] {
  const { limit = 30, minScore = 0.12 } = opts;
  let pool = recipes;

  // pre-filters that are genuinely binary (never show, don't just rank down)
  if (ctx.diet === 'vegetarian') pool = pool.filter((r) => !r.tags.includes('diet:egg'));
  if (ctx.noCookOnly) pool = pool.filter((r) => r.equipment.includes('no-cook'));
  if (ctx.mealType && ctx.mealType !== 'any') {
    pool = pool.filter((r) => r.mealType === ctx.mealType || r.mealType === 'any');
  }

  const scored = pool
    .map((r) => scoreRecipe(r, ctx))
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score || a.recipe.costInr - b.recipe.costInr);

  return scored.slice(0, limit);
}

/**
 * "Nothing matches all your constraints. Relax one of these?" (§42)
 * Finds the single constraint whose relaxation adds the most results.
 */
export interface RelaxSuggestion {
  key: 'budget' | 'time' | 'effort' | 'equipment' | 'calories';
  label: string;
  extraResults: number;
  apply: (ctx: DecisionContext) => DecisionContext;
}

export function suggestRelaxations(
  recipes: Recipe[],
  ctx: DecisionContext,
): RelaxSuggestion[] {
  const baseCount = rankRecipes(recipes, ctx, { limit: 999, minScore: 0.25 }).length;
  const candidates: RelaxSuggestion[] = [];

  if (ctx.budgetInr != null) {
    const next = ctx.budgetInr + (ctx.budgetInr <= 30 ? 10 : 20);
    candidates.push({
      key: 'budget',
      label: `Raise budget to ₹${next}`,
      extraResults: 0,
      apply: (c) => ({ ...c, budgetInr: next }),
    });
  }
  if (ctx.timeMinutes != null) {
    candidates.push({
      key: 'time',
      label: `Allow ${ctx.timeMinutes + 5} minutes`,
      extraResults: 0,
      apply: (c) => ({ ...c, timeMinutes: c.timeMinutes! + 5 }),
    });
  }
  if (ctx.maxEffort && ctx.maxEffort !== 'high') {
    const bump = { 'very-low': 'low', low: 'medium', medium: 'high' } as const;
    candidates.push({
      key: 'effort',
      label: `Allow a bit more effort`,
      extraResults: 0,
      apply: (c) => ({ ...c, maxEffort: bump[c.maxEffort as keyof typeof bump] }),
    });
  }
  if (ctx.calorieBand) {
    candidates.push({
      key: 'calories',
      label: `Widen the calorie range`,
      extraResults: 0,
      apply: (c) => ({
        ...c,
        calorieBand: [c.calorieBand![0] - 150, c.calorieBand![1] + 150] as [number, number],
      }),
    });
  }
  if (ctx.equipmentAvailable && ctx.equipmentAvailable.length > 0 && ctx.equipmentAvailable.length < 4) {
    candidates.push({
      key: 'equipment',
      label: `Allow another cooking method`,
      extraResults: 0,
      apply: (c) => ({ ...c, equipmentAvailable: null }),
    });
  }

  for (const cand of candidates) {
    const count = rankRecipes(recipes, cand.apply(ctx), { limit: 999, minScore: 0.25 }).length;
    cand.extraResults = Math.max(0, count - baseCount);
  }

  return candidates.filter((c) => c.extraResults > 0).sort((a, b) => b.extraResults - a.extraResults);
}
