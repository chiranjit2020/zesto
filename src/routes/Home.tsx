import { Link, useNavigate } from 'react-router-dom';
import { RECIPES } from '../data/catalog';
import { rankRecipes } from '../domain/recommend';
import { useDecisionContext } from '../app/useDecisionContext';
import { usePantry } from '../state/pantry';
import { useCook } from '../state/cook';
import { RECIPE_BY_NUMBER } from '../data/catalog';
import { useClock, isLateNight } from '../lib/hooks';
import { RecipeCard } from '../components/RecipeCard';
import { SectionHeader } from '../components/ui/primitives';
import { Button, ButtonLink } from '../components/ui/Button';
import { useMemo } from 'react';

const MODES = [
  { to: '/make', emoji: '🍳', title: 'What can I make?', sub: 'From what you have' },
  { to: '/broke', emoji: '🪙', title: "I'm broke", sub: 'Tiny budget' },
  { to: '/tired', emoji: '😵', title: "I'm too tired", sub: 'Low effort, low cleanup' },
  { to: '/midnight', emoji: '🌙', title: 'Midnight hunger', sub: 'Quiet & quick' },
  { to: '/leftovers', emoji: '♻️', title: 'Use my leftovers', sub: 'Rescue what you have' },
  { to: '/improvise', emoji: '🧪', title: 'Make a ₹99 meal', sub: 'Base + protein + veg + flavour' },
  { to: '/planner', emoji: '📅', title: 'Plan my week', sub: 'Plan + shopping list' },
  { to: '/surprise', emoji: '🎲', title: 'Surprise me', sub: 'Let Zesto decide' },
];

const QUICK = [
  { label: 'Under ₹30', to: '/discover?maxCost=30' },
  { label: 'Under ₹50', to: '/discover?maxCost=50' },
  { label: '15 min', to: '/discover?maxTime=15' },
  { label: 'One pan', to: '/discover?equipment=one-pan' },
  { label: 'No cooking', to: '/discover?noCook=1' },
  { label: 'High protein', to: '/discover?highProtein=1' },
  { label: 'Vegetarian', to: '/discover?diet=vegetarian' },
];

export function Home() {
  const navigate = useNavigate();
  const now = useClock(60000);
  const pantryItems = usePantry((s) => s.items);
  const cook = useCook();
  const ctx = useDecisionContext();

  const personalised = useMemo(() => {
    if (pantryItems.length === 0) return [];
    return rankRecipes(RECIPES, ctx, { limit: 4, minScore: 0.3 });
  }, [ctx, pantryItems.length]);

  const cookingRecipe = cook.recipeNumber ? RECIPE_BY_NUMBER.get(cook.recipeNumber) : null;
  const hour = now.getHours();
  const greeting = hour < 5 ? 'Still up?' : hour < 12 ? 'Morning.' : hour < 17 ? 'Afternoon.' : 'Evening.';

  return (
    <div className="space-y-8">
      {cookingRecipe && (
        <Link
          to={`/cook/${cookingRecipe.slug}`}
          className="z-card p-4 flex items-center justify-between grad-brand text-white"
        >
          <div>
            <div className="text-2xs font-bold uppercase tracking-wide opacity-80">Still cooking</div>
            <div className="font-bold">{cookingRecipe.title}</div>
            <div className="text-xs opacity-90">
              Step {cook.step + 1} of {cookingRecipe.steps.length}
            </div>
          </div>
          <span className="text-2xl">→</span>
        </Link>
      )}

      <section>
        <p className="text-sm font-semibold text-content-muted">{greeting}</p>
        <h1 className="text-display font-bold mt-1 text-balance">What can you make right now?</h1>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {MODES.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="z-card p-3.5 hover:border-brand/40 transition-colors flex flex-col gap-1 min-h-[92px]"
            >
              <span className="text-2xl" aria-hidden>{m.emoji}</span>
              <span className="font-bold leading-tight text-sm">{m.title}</span>
              <span className="text-2xs text-content-faint">{m.sub}</span>
            </Link>
          ))}
        </div>
      </section>

      {isLateNight(now) && (
        <Link to="/midnight" className="z-card p-4 grad-night text-white flex items-center gap-3">
          <span className="text-2xl">🌙</span>
          <div className="flex-1">
            <div className="font-bold">
              {now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} — hungry?
            </div>
            <div className="text-xs opacity-90">Quiet kitchen, minimal cleanup. How much effort have you got?</div>
          </div>
          <span className="text-xl">→</span>
        </Link>
      )}

      <section>
        <SectionHeader title="Quick filters" />
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q.label}
              onClick={() => navigate(q.to)}
              className="z-chip z-tap !py-2 hover:border-brand/40"
            >
              {q.label}
            </button>
          ))}
        </div>
      </section>

      {personalised.length > 0 ? (
        <section>
          <SectionHeader
            title="Because you have…"
            sub={`${pantryItems.length} ${pantryItems.length === 1 ? 'ingredient' : 'ingredients'} in your pantry`}
            action={<Link to="/make" className="text-xs font-semibold text-brand">See all</Link>}
          />
          <div className="grid grid-cols-2 gap-2.5">
            {personalised.map((s) => (
              <RecipeCard key={s.recipe.number} recipe={s.recipe} footnote={s.reasons[0]} />
            ))}
          </div>
        </section>
      ) : (
        <section className="z-card p-5 text-center">
          <div className="text-3xl mb-2">🧺</div>
          <h2 className="font-bold">Tell Zesto what's in your kitchen</h2>
          <p className="text-sm text-content-muted mt-1 mb-4">
            Add a few ingredients and every recommendation gets sharper.
          </p>
          <ButtonLink to="/pantry" size="sm">Set up my pantry</ButtonLink>
        </section>
      )}

      <section>
        <SectionHeader title="Just browsing?" action={<Link to="/discover" className="text-xs font-semibold text-brand">All 99</Link>} />
        <div className="grid grid-cols-2 gap-2.5">
          {RECIPES.slice(0, 4).map((r) => (
            <RecipeCard key={r.number} recipe={r} />
          ))}
        </div>
        <div className="mt-4">
          <Button variant="secondary" block onClick={() => navigate('/surprise')}>
            🎲 I really don't want to think — surprise me
          </Button>
        </div>
      </section>
    </div>
  );
}
