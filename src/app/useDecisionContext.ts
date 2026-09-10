import { useMemo } from 'react';
import type { DecisionContext } from '../domain/types';
import { usePrefs } from '../state/prefs';
import { usePantry, pantryContextIds } from '../state/pantry';
import { useKitchen, recentlyCookedNumbers } from '../state/kitchen';
import type { Constraints } from '../components/ConstraintForm';

/**
 * Assembles the DecisionContext from the user's persisted world (prefs + pantry + history)
 * plus a set of ad-hoc constraints for this moment. This is the single seam between the
 * app's state and the pure domain engine.
 */
export function useDecisionContext(
  constraints: Partial<Constraints> = {},
  extra: Partial<DecisionContext> = {},
): DecisionContext {
  const prefs = usePrefs();
  const pantryItems = usePantry((s) => s.items);
  const history = useKitchen((s) => s.history);
  const likedTags = usePrefs((s) => s.likedTags);

  return useMemo(() => {
    return {
      pantry: pantryContextIds(pantryItems),
      budgetInr: constraints.budgetInr ?? prefs.defaultBudgetInr ?? null,
      timeMinutes: constraints.timeMinutes ?? prefs.defaultTimeMinutes ?? null,
      calorieBand: constraints.calorieBand ?? null,
      maxEffort: constraints.maxEffort ?? prefs.defaultMaxEffort ?? null,
      equipmentAvailable:
        constraints.equipment ?? (prefs.equipmentOwned.length ? prefs.equipmentOwned : null),
      diet: prefs.diet,
      servings: prefs.servings,
      leftoverIngredients: [],
      recentlyCookedNumbers: recentlyCookedNumbers(history),
      likedTags,
      ...extra,
    };
  }, [
    pantryItems,
    history,
    likedTags,
    prefs.defaultBudgetInr,
    prefs.defaultTimeMinutes,
    prefs.defaultMaxEffort,
    prefs.equipmentOwned,
    prefs.diet,
    prefs.servings,
    constraints.budgetInr,
    constraints.timeMinutes,
    constraints.calorieBand,
    constraints.maxEffort,
    constraints.equipment,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(extra),
  ]);
}
