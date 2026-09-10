/** Core domain types. Kept free of any framework or I/O concern. */

export type EquipmentId =
  | 'no-cook'
  | 'kettle'
  | 'microwave'
  | 'one-pan'
  | 'one-pot'
  | 'tawa'
  | 'rice-cooker';

export type Diet = 'vegetarian' | 'egg' | 'any';

export type MealType = 'breakfast' | 'main' | 'snack' | 'dessert' | 'any';

export type EffortLevel = 'very-low' | 'low' | 'medium' | 'high';

export type IngredientCategory =
  | 'protein' | 'pulse' | 'dairy' | 'grain' | 'vegetable' | 'fruit' | 'herb'
  | 'oil-fat' | 'spice' | 'seasoning' | 'sweetener' | 'condiment' | 'snack'
  | 'pantry' | 'leftover' | 'other';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  /** cheap / always-assumed on hand — does not count against a pantry match */
  isStaple: boolean;
  shelfLifeDays: number | null;
  usedInCount: number;
}

export interface RecipeIngredient {
  raw: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
  canonical: string[];
}

export interface Nutrition {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  basis: 'heuristic-estimate' | 'sourced';
  confidence: 'low' | 'medium' | 'high';
}

export interface Recipe {
  number: number;
  title: string;
  slug: string;
  tagline: string;
  chapter: string;
  mealType: MealType;
  timeText: string;
  timeMinutes: number;
  needsPrecookedBase: boolean;
  headlineCostInr: number;
  /** canonical cost used across the app (itemised breakdown total) */
  costInr: number;
  serves: number;
  equipmentText: string;
  equipment: EquipmentId[];
  level: 'Beginner' | 'Easy';
  whyYoullLoveIt: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  moneyHack: string;
  swapIt: string | null;
  costBreakdownText: string;
  costBreakdownItems: { item: string; costInr: number }[];
  closingLine: string;
  tags: string[];
  nutrition: Nutrition;
  /** non-staple canonical ingredient ids — what the pantry match is scored on */
  keyIngredients: string[];
  stapleIngredients: string[];

  // ---- derived at catalog-build time ----
  effort: {
    score: number; // 0..1, higher = more effort
    level: EffortLevel;
    signals: string[];
  };
  cleanupVessels: number;
  quiet: boolean; // suitable for a quiet midnight kitchen
}

/** A pantry line the user actually owns. */
export interface PantryItem {
  id: string;
  ingredientId: string;
  quantity: number | null;
  unit: string | null;
  expiry: string | null; // ISO date
  estValueInr: number | null;
  addedAt: string;
}

export interface MealHistoryEntry {
  id: string;
  recipeNumber: number;
  cookedAt: string; // ISO
  servings: number;
  actualCostInr: number | null;
  rating: 1 | 2 | 3 | 4 | 5 | null;
  wasLeftoverRescue: boolean;
  deliveryAvoided: boolean;
}

export interface Preferences {
  diet: Diet;
  equipmentOwned: EquipmentId[];
  defaultBudgetInr: number | null;
  defaultTimeMinutes: number | null;
  defaultMaxEffort: EffortLevel | null;
  servings: number;
  theme: 'light' | 'dark' | 'system';
  likedTags: string[];
}

/** Everything the decision engine needs to score a recipe. */
export interface DecisionContext {
  pantry: string[]; // canonical ingredient ids the user has (staples auto-added)
  budgetInr: number | null;
  timeMinutes: number | null;
  calorieBand: [number, number] | null;
  maxEffort: EffortLevel | null;
  equipmentAvailable: EquipmentId[] | null; // null = any
  diet: Diet;
  servings: number;
  leftoverIngredients: string[]; // canonical ids flagged as leftovers to use up
  recentlyCookedNumbers: number[];
  likedTags: string[];
  /** hard filter: only recipes that need no cooking at all */
  noCookOnly?: boolean;
  mealType?: MealType;
  /** the book's editorially-curated picks for this situation — a gentle rank boost */
  preferredNumbers?: number[];
}

export interface ScoredRecipe {
  recipe: Recipe;
  score: number; // 0..1
  factors: Record<string, number>;
  reasons: string[];
  haveIngredients: string[];
  missingIngredients: string[];
  missingOptional: string[];
}
