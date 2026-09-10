import { useMemo } from 'react';
import type { DecisionContext } from '../domain/types';
import { RECIPES } from '../data/catalog';
import { rankRecipes, suggestRelaxations } from '../domain/recommend';
import { MatchCard } from './RecipeCard';
import { EmptyState } from './ui/primitives';
import { Button } from './ui/Button';

export function ResultsView({
  ctx,
  onRelax,
  limit = 12,
  emptyIcon = '🤔',
}: {
  ctx: DecisionContext;
  onRelax?: (next: DecisionContext) => void;
  limit?: number;
  emptyIcon?: string;
}) {
  const results = useMemo(() => rankRecipes(RECIPES, ctx, { limit }), [ctx, limit]);
  const relaxations = useMemo(
    () => (results.length === 0 ? suggestRelaxations(RECIPES, ctx) : []),
    [results.length, ctx],
  );

  if (results.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title="Nothing matches all your constraints"
        body={
          relaxations.length
            ? 'Loosen one of these and Zesto will find something:'
            : 'Try adding a few ingredients to your pantry, or widen your budget.'
        }
        action={
          relaxations.length && onRelax ? (
            <div className="flex flex-wrap justify-center gap-2">
              {relaxations.slice(0, 3).map((r) => (
                <Button key={r.key} variant="secondary" size="sm" onClick={() => onRelax(r.apply(ctx))}>
                  {r.label} <span className="text-content-faint">+{r.extraResults}</span>
                </Button>
              ))}
            </div>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {results.map((s, i) => (
        <MatchCard key={s.recipe.number} scored={s} rank={i} />
      ))}
    </div>
  );
}
