import type { Recipe } from '../domain/types';
import { equipmentLabel } from '../lib/format';
import { EstimateTag } from './ui/primitives';

/** The scannable stat line every recipe surface leads with (§9, §23). */
export function RecipeMeta({
  recipe,
  size = 'md',
  showEstimate = true,
}: {
  recipe: Recipe;
  size?: 'sm' | 'md' | 'lg';
  showEstimate?: boolean;
}) {
  const cls =
    size === 'lg' ? 'text-base gap-x-3 gap-y-1' : size === 'sm' ? 'text-2xs gap-x-2 gap-y-0.5' : 'text-xs gap-x-2.5 gap-y-1';
  return (
    <div className={`flex flex-wrap items-center font-semibold text-content-muted ${cls}`}>
      <span className="text-content">₹{recipe.costInr}</span>
      <Dot />
      <span>{recipe.timeMinutes} min</span>
      <Dot />
      <span>{recipe.equipment.map(equipmentLabel).join(' / ')}</span>
      <Dot />
      <span className="capitalize">{recipe.effort.level.replace('-', ' ')} effort</span>
      <Dot />
      <span>
        ~{recipe.nutrition.calories} kcal
        {showEstimate && <EstimateTag />}
      </span>
    </div>
  );
}

function Dot() {
  return <span className="text-content-faint" aria-hidden>·</span>;
}

/** A single tappable "recipe object" identity — gradient art keyed to its chapter. */
const CHAPTER_ART: Record<string, string> = {
  'Ultra-Quick 5–10 Minute Meals': 'linear-gradient(135deg,#4CBDF7,#9035C0)',
  'Breakfast & Morning Meals': 'linear-gradient(135deg,#FDCF00,#F7B200)',
  'Maggi/Noodles Reinvented': 'linear-gradient(135deg,#F7B200,#9035C0)',
  'Rice & One-Pot Meals': 'linear-gradient(135deg,#9035C0,#4CBDF7)',
  'Roti/Bread-Based Meals': 'linear-gradient(135deg,#F7B200,#4CBDF7)',
  'Egg-Based Meals': 'linear-gradient(135deg,#FDCF00,#4CBDF7)',
  'Vegetarian Comfort Food': 'linear-gradient(135deg,#4CBDF7,#F7B200)',
  'Budget Snacks & Late-Night Hunger': 'linear-gradient(160deg,#201246,#4CBDF7)',
  'Sweet/Cheap Comfort Recipes': 'linear-gradient(135deg,#F7B200,#FDCF00)',
  'Emergency “Almost Nothing Left” Meals': 'linear-gradient(160deg,#0B1020,#9035C0)',
};

export function recipeArt(recipe: Recipe): string {
  return CHAPTER_ART[recipe.chapter] ?? 'linear-gradient(135deg,#9035C0,#4CBDF7)';
}
