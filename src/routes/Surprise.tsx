import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ConstraintForm, NO_CONSTRAINTS, type Constraints } from '../components/ConstraintForm';
import { RecipeMeta } from '../components/RecipeMeta';
import { Button, ButtonLink } from '../components/ui/Button';
import { ZMark } from '../components/ui/ZMark';
import { RECIPES } from '../data/catalog';
import { rankRecipes } from '../domain/recommend';
import { useDecisionContext } from '../app/useDecisionContext';
import type { ScoredRecipe } from '../domain/types';

export function Surprise() {
  const [constraints, setConstraints] = useState<Constraints>(NO_CONSTRAINTS);
  const [pick, setPick] = useState<ScoredRecipe | null>(null);
  const [rolling, setRolling] = useState(false);
  const ctx = useDecisionContext(constraints);

  const roll = () => {
    setRolling(true);
    const pool = rankRecipes(RECIPES, ctx, { limit: 14, minScore: 0.15 });
    setTimeout(() => {
      const top = pool.slice(0, Math.min(8, pool.length));
      const chosen = top[Math.floor(Math.random() * top.length)] ?? null;
      setPick(chosen);
      setRolling(false);
    }, 550);
  };

  return (
    <div className="space-y-6">
      <PageHeader emoji="🎲" title="Surprise me" sub="Give me the limits. I'll pick." />

      <section className="z-card p-4">
        <ConstraintForm value={constraints} onChange={setConstraints} />
      </section>

      {!pick ? (
        <div className="text-center py-8">
          <div className={rolling ? 'animate-spin' : ''}>
            <ZMark size={64} />
          </div>
          <Button size="lg" className="mt-6" onClick={roll} disabled={rolling}>
            {rolling ? 'Deciding…' : "🎲 Decide for me"}
          </Button>
        </div>
      ) : (
        <div className="z-card p-6 text-center animate-rise">
          <p className="text-sm font-semibold text-content-muted">Tonight you're making…</p>
          <h2 className="text-2xl font-bold mt-1 z-gradient-text">{pick.recipe.title}</h2>
          <div className="mt-3 flex justify-center">
            <RecipeMeta recipe={pick.recipe} />
          </div>
          <p className="text-sm text-content-muted mt-3">{pick.recipe.tagline}</p>
          {pick.reasons[0] && (
            <p className="text-sm font-semibold text-positive mt-2">✓ {pick.reasons[0]}</p>
          )}
          <div className="mt-5 flex gap-2 justify-center">
            <ButtonLink to={`/cook/${pick.recipe.slug}`} size="md">Let's cook</ButtonLink>
            <Button variant="secondary" onClick={roll}>Roll again</Button>
          </div>
          <Link to={`/r/${pick.recipe.slug}`} className="inline-block mt-3 text-xs font-semibold text-brand">
            See the full recipe first
          </Link>
        </div>
      )}
    </div>
  );
}
