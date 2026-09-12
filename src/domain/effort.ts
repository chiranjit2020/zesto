import type { EffortLevel, EquipmentId } from './types.js';

/**
 * Effort Score (§16). Cooking time alone is not effort — chopping, multiple vessels
 * and constant attention are. Derived deterministically from structured signals so it
 * stays explainable and tunable.
 */

const PREP_VERBS = /\b(chop|dice|mince|grate|knead|roll out|whisk|beat|mash|peel|slice|crush|blend|soak|marinate|sprout)\b/i;
const ATTENTION = /\b(stir constantly|stirring constantly|don't walk away|stay right next|keep (?:stirring|folding|moving)|without stopping|constant)\b/i;
const MULTI_VESSEL = /\b(another (?:pan|pot|bowl)|separate (?:pan|pot|bowl)|second (?:pan|pot)|transfer .* to a)\b/i;

export interface EffortResult {
  score: number;
  level: EffortLevel;
  signals: string[];
  cleanupVessels: number;
  quiet: boolean;
}

export function computeEffort(input: {
  steps: string[];
  equipment: EquipmentId[];
  ingredientCount: number;
  timeMinutes: number;
  level: 'Beginner' | 'Easy';
  needsPrecookedBase: boolean;
}): EffortResult {
  const method = input.steps.join(' \n ');
  const signals: string[] = [];
  let score = 0;

  // base: number of steps
  const stepPart = Math.min(input.steps.length / 16, 1) * 0.28;
  score += stepPart;
  if (input.steps.length >= 10) signals.push(`${input.steps.length} steps`);

  // no-cook is the floor
  if (input.equipment.includes('no-cook')) {
    signals.push('no cooking');
    score = Math.min(score, 0.12);
  }

  // prep complexity
  const prepHits = (method.match(new RegExp(PREP_VERBS, 'gi')) ?? []).length;
  if (prepHits > 0) {
    score += Math.min(prepHits / 6, 1) * 0.2;
    if (prepHits >= 2) signals.push('some chopping / prep');
  }

  // constant attention
  if (ATTENTION.test(method)) {
    score += 0.16;
    signals.push('needs constant attention');
  }

  // multiple vessels → cleanup
  let cleanupVessels = 1;
  if (input.equipment.includes('no-cook')) cleanupVessels = 1;
  if (MULTI_VESSEL.test(method)) {
    cleanupVessels = 2;
    score += 0.12;
    signals.push('more than one pan to wash');
  }
  if (/\bbowl\b/i.test(method) && !input.equipment.includes('no-cook')) cleanupVessels += 0;

  // ingredient count
  score += Math.min(Math.max(input.ingredientCount - 4, 0) / 8, 1) * 0.12;

  // longer active time
  if (input.timeMinutes > 15) {
    score += 0.08;
    signals.push('over 15 minutes');
  }
  if (input.level === 'Easy') score += 0.04;
  if (input.needsPrecookedBase) {
    // needs something cooked ahead — real effort lives elsewhere
    signals.push('needs pre-cooked rice/roti');
  }

  score = Math.max(0, Math.min(1, score));

  const level: EffortLevel =
    score < 0.18 ? 'very-low' : score < 0.4 ? 'low' : score < 0.62 ? 'medium' : 'high';

  // quiet-kitchen suitability (Midnight mode): low effort, few vessels, quick, no
  // aggressive frying / pressure / blender
  const noisy = /\b(blend|grind|pressure cook|deep fry|deep-fry)\b/i.test(method);
  const quiet =
    !noisy && cleanupVessels <= 1 && input.timeMinutes <= 12 && score < 0.45;

  if (signals.length === 0) signals.push('barely any work');

  return { score, level, signals, cleanupVessels, quiet };
}

export const EFFORT_ORDER: EffortLevel[] = ['very-low', 'low', 'medium', 'high'];
export const effortRank = (e: EffortLevel) => EFFORT_ORDER.indexOf(e);
