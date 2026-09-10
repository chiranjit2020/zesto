import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { MatchCard } from '../components/RecipeCard';
import { RECIPES, recipesForList, CURATED_LISTS } from '../data/catalog';
import { rankRecipes } from '../domain/recommend';
import { useDecisionContext } from '../app/useDecisionContext';
import { useClock } from '../lib/hooks';

const EFFORT = [
  { id: 'none', label: 'Literally none' },
  { id: 'bowl', label: 'One bowl' },
  { id: 'pan', label: 'One pan' },
];

export function Midnight() {
  const now = useClock(30000);
  const [effort, setEffort] = useState<string | null>(null);
  const ctx = useDecisionContext(
    {
      maxEffort: 'very-low',
      timeMinutes: 12,
      equipment: effort === 'none' ? ['no-cook'] : effort === 'bowl' ? ['no-cook', 'microwave', 'kettle'] : ['one-pan'],
    },
    { noCookOnly: effort === 'none', preferredNumbers: CURATED_LISTS['situational:midnight'] },
  );

  // scope the whole page to the midnight surface
  useEffect(() => {
    document.documentElement.setAttribute('data-surface', 'midnight');
    return () => document.documentElement.removeAttribute('data-surface');
  }, []);

  const curated = useMemo(() => recipesForList('situational:midnight'), []);
  const results = useMemo(() => {
    if (!effort) return [];
    return rankRecipes(RECIPES, ctx, { limit: 8, minScore: 0.08 })
      .filter((s) => s.recipe.quiet || s.recipe.equipment.includes('no-cook'))
      .sort((a, b) => a.recipe.effort.score - b.recipe.effort.score);
  }, [ctx, effort]);

  return (
    <div className="space-y-6">
      <PageHeader emoji="🌙" title="Midnight hunger" sub="Quiet kitchen. Minimal cleanup. In and out." />

      <div className="z-card p-6 grad-night text-white text-center">
        <div className="z-stat-num text-3xl">
          {now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
        </div>
        <p className="mt-3 font-semibold">How much effort are you willing to make?</p>
        <div className="mt-4 flex flex-col gap-2">
          {EFFORT.map((e) => (
            <button
              key={e.id}
              onClick={() => setEffort(e.id)}
              className={`rounded-full py-3 font-bold transition-all ${
                effort === e.id ? 'bg-white text-ink' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {!effort ? (
        <div>
          <h2 className="text-sm font-bold text-content-muted mb-3">The classic midnight fixes</h2>
          <div className="space-y-3 opacity-90">
            {curated.slice(0, 4).map((r) => (
              <MatchCard
                key={r.number}
                scored={{
                  recipe: r,
                  score: 0.5,
                  factors: {},
                  reasons: [r.tagline],
                  haveIngredients: [],
                  missingIngredients: [],
                  missingOptional: [],
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((s, i) => (
            <MatchCard key={s.recipe.number} scored={s} rank={i} />
          ))}
        </div>
      )}
    </div>
  );
}
