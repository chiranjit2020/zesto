import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { DecisionContext } from '../domain/types';
import { RECIPES } from '../data/catalog';
import { rankRecipes, suggestRelaxations } from '../domain/recommend';
import { MatchCard } from './RecipeCard';
import { EmptyState } from './ui/primitives';
import { Button } from './ui/Button';
import type { IconName } from './ui/Icon';
import { track } from '../lib/track';

export function ResultsView({
  ctx,
  onRelax,
  limit = 12,
  emptyIcon = 'search',
}: {
  ctx: DecisionContext;
  onRelax?: (next: DecisionContext) => void;
  limit?: number;
  emptyIcon?: IconName;
}) {
  const results = useMemo(() => rankRecipes(RECIPES, ctx, { limit }), [ctx, limit]);
  const relaxations = useMemo(
    () => (results.length === 0 ? suggestRelaxations(RECIPES, ctx) : []),
    [results.length, ctx],
  );

  // One shared component behind every situational mode (Broke/Tired/Midnight/…),
  // WhatCanIMake, and Discover — the mode name comes from the route rather than a prop
  // threaded through each of those callers (docs/ANALYTICS_FEEDBACK_PLAN.md §4).
  const location = useLocation();
  useEffect(() => {
    track('recommendation_generated', {
      mode: location.pathname.split('/').filter(Boolean)[0] ?? 'home',
      number_of_results: results.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.length, location.pathname]);

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
