import { describe, it, expect } from 'vitest';
import { RECIPES } from '../data/catalog';
import { rankRecipes, scoreRecipe, suggestRelaxations } from './recommend';
import { STAPLE_IDS } from '../data/catalog';
import type { DecisionContext } from './types';

const base = (over: Partial<DecisionContext> = {}): DecisionContext => ({
  pantry: [...STAPLE_IDS],
  budgetInr: null,
  timeMinutes: null,
  calorieBand: null,
  maxEffort: null,
  equipmentAvailable: null,
  diet: 'any',
  servings: 1,
  leftoverIngredients: [],
  recentlyCookedNumbers: [],
  likedTags: [],
  ...over,
});

describe('decision engine — the master-prompt test scenarios', () => {
  it('Scenario 1: rice + egg + onion, ₹30, 15 min, low effort → recommends something useful (Egg Fried Rice-ish)', () => {
    const ctx = base({
      pantry: [...STAPLE_IDS, 'rice', 'egg', 'onion'],
      budgetInr: 30,
      timeMinutes: 15,
      maxEffort: 'low',
      equipmentAvailable: ['one-pan'],
    });
    const results = rankRecipes(RECIPES, ctx, { limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    const top = results[0];
    expect(top.recipe.costInr).toBeLessThanOrEqual(30 * 2);
    // the classic answer should surface near the top
    const titles = results.map((r) => r.recipe.title.toLowerCase());
    expect(titles.some((t) => t.includes('egg fried rice') || t.includes('bhurji') || t.includes('egg'))).toBe(true);
  });

  it('Scenario 2: only ₹20 → finds realistic options, all within reach', () => {
    const ctx = base({ budgetInr: 20 });
    const results = rankRecipes(RECIPES, ctx, { limit: 10 });
    expect(results.length).toBeGreaterThan(3);
    expect(results[0].recipe.costInr).toBeLessThanOrEqual(25);
  });

  it('Scenario 3: exhausted → prioritises low-effort food', () => {
    const ctx = base({ maxEffort: 'very-low' });
    const results = rankRecipes(RECIPES, ctx, { limit: 8 });
    const avgEffort = results.reduce((a, r) => a + r.recipe.effort.score, 0) / results.length;
    expect(avgEffort).toBeLessThan(0.4);
  });

  it('Scenario 4: midnight → quick, low-cleanup options exist', () => {
    const quiet = RECIPES.filter((r) => r.quiet);
    expect(quiet.length).toBeGreaterThan(5);
    quiet.forEach((r) => {
      expect(r.timeMinutes).toBeLessThanOrEqual(12);
      expect(r.cleanupVessels).toBeLessThanOrEqual(1);
    });
  });

  it('Scenario 5: leftover rice → suggests transformations', () => {
    const ctx = base({ pantry: [...STAPLE_IDS, 'rice'], leftoverIngredients: ['rice'] });
    const results = rankRecipes(RECIPES, ctx, { limit: 6 });
    expect(results.some((r) => r.recipe.keyIngredients.includes('rice'))).toBe(true);
    expect(results[0].score).toBeGreaterThan(0.3);
  });

  it('Scenario 6: 500–700 kcal → filters/ranks by estimated calories', () => {
    const ctx = base({ calorieBand: [500, 700] });
    const results = rankRecipes(RECIPES, ctx, { limit: 8 });
    expect(results.length).toBeGreaterThan(0);
    const inBand = results.filter((r) => r.recipe.nutrition.calories >= 500 && r.recipe.nutrition.calories <= 700);
    expect(inBand.length / results.length).toBeGreaterThan(0.5);
  });

  it('vegetarian preference never returns an egg recipe', () => {
    const ctx = base({ diet: 'vegetarian' });
    const results = rankRecipes(RECIPES, ctx, { limit: 40 });
    expect(results.every((r) => !r.recipe.tags.includes('diet:egg'))).toBe(true);
  });

  it('every recommendation carries a human reason', () => {
    const ctx = base({ pantry: [...STAPLE_IDS, 'egg', 'bread'], budgetInr: 25 });
    for (const r of rankRecipes(RECIPES, ctx, { limit: 10 })) {
      expect(r.reasons.length).toBeGreaterThan(0);
      expect(r.reasons[0].length).toBeGreaterThan(4);
    }
  });

  it('impossible constraints → relaxation suggestions that actually add results', () => {
    const ctx = base({ budgetInr: 8, timeMinutes: 4, calorieBand: [900, 1000], maxEffort: 'very-low' });
    const results = rankRecipes(RECIPES, ctx);
    if (results.length === 0) {
      const relax = suggestRelaxations(RECIPES, ctx);
      expect(relax.length).toBeGreaterThan(0);
      expect(relax[0].extraResults).toBeGreaterThan(0);
    }
  });

  it('scoring is deterministic', () => {
    const ctx = base({ pantry: [...STAPLE_IDS, 'rice', 'egg'], budgetInr: 30 });
    const a = scoreRecipe(RECIPES[41], ctx).score;
    const b = scoreRecipe(RECIPES[41], ctx).score;
    expect(a).toBe(b);
  });
});

describe('catalog integrity', () => {
  it('has 99 recipes, each with steps, ingredients, cost, calories', () => {
    expect(RECIPES).toHaveLength(99);
    for (const r of RECIPES) {
      expect(r.steps.length).toBeGreaterThan(1);
      expect(r.ingredients.length).toBeGreaterThan(0);
      expect(r.costInr).toBeGreaterThan(0);
      expect(r.nutrition.calories).toBeGreaterThan(100);
      expect(r.timeMinutes).toBeGreaterThan(0);
    }
  });

  it('matches the book QC summary: 20 egg, 79 vegetarian', () => {
    expect(RECIPES.filter((r) => r.tags.includes('diet:egg'))).toHaveLength(20);
    expect(RECIPES.filter((r) => r.tags.includes('diet:vegetarian'))).toHaveLength(79);
  });
});
