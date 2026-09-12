import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { RECIPE_BY_SLUG, INGREDIENT_BY_ID } from '../data/catalog';
import { usePantry } from '../state/pantry';
import { useKitchen } from '../state/kitchen';
import { costView } from '../domain/cost';
import { RecipeMeta, recipeArt } from '../components/RecipeMeta';
import { PageHeader } from '../components/PageHeader';
import { Badge, EstimateTag } from '../components/ui/primitives';
import { ButtonLink, Button } from '../components/ui/Button';
import { ZWatermark } from '../components/ui/ZMark';
import { Icon } from '../components/ui/Icon';
import { shareRecipe } from '../lib/shareCard';
import { track } from '../lib/track';

export function RecipeDetail() {
  const { slug } = useParams();
  const recipe = slug ? RECIPE_BY_SLUG.get(slug) : undefined;
  const pantryHas = usePantry((s) => s.items.map((i) => i.ingredientId));
  const addPantry = usePantry((s) => s.add);
  const { isFavorite, toggleFavorite } = useKitchen();
  const [sharing, setSharing] = useState(false);

  const split = useMemo(() => {
    if (!recipe) return { have: [], need: [], optional: [] };
    const have: string[] = [];
    const need: string[] = [];
    const optional: string[] = [];
    for (const ing of recipe.ingredients) {
      const id = ing.canonical[0];
      const label = INGREDIENT_BY_ID.get(id)?.name ?? ing.name;
      const isStaple = id && recipe.stapleIngredients.includes(id);
      if (ing.optional) optional.push(ing.raw);
      else if (isStaple || (id && pantryHas.includes(id))) have.push(label);
      else need.push(id ?? ing.name);
    }
    return {
      have: [...new Set(have)],
      need: [...new Set(need)],
      optional,
    };
  }, [recipe, pantryHas]);

  useEffect(() => {
    if (recipe) track('recipe_viewed', { recipe_number: recipe.number });
  }, [recipe]);

  if (!recipe) return <Navigate to="/discover" replace />;

  const cost = costView(recipe);
  const fav = isFavorite(recipe.number);

  return (
    <div className="space-y-6">
      <PageHeader title="" />

      <div className="-mt-2 rounded-xl overflow-hidden relative h-28" style={{ backgroundImage: recipeArt(recipe) }}>
        <div className="absolute inset-0 grid place-items-center">
          <ZWatermark size={64} />
        </div>
      </div>

      <header>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-balance">{recipe.title}</h1>
          <button
            onClick={() => toggleFavorite(recipe.number)}
            aria-label={fav ? 'Remove from favorites' : 'Save to favorites'}
            aria-pressed={fav}
            className="z-tap shrink-0 grid place-items-center"
          >
            <Icon
              name="star"
              size={22}
              className={fav ? 'text-caution fill-caution' : 'text-content-faint'}
            />
          </button>
        </div>
        <p className="text-sm text-content-muted mt-1">{recipe.tagline}</p>
        <div className="mt-3">
          <RecipeMeta recipe={recipe} size="md" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone="neutral">{recipe.level}</Badge>
          <Badge tone="neutral">{recipe.chapter.replace(/ *[—–].*/, '').slice(0, 26)}</Badge>
          {recipe.tags.includes('uses-leftovers') && (
            <Badge tone="positive"><Icon name="reuse" size={12} /> uses leftovers</Badge>
          )}
          {recipe.serves > 1 && <Badge tone="neutral">serves {recipe.serves}</Badge>}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="z-card p-3.5">
          <div className="text-2xs font-bold uppercase tracking-wide text-content-faint mb-1.5">
            You already have
          </div>
          <ul className="text-sm space-y-0.5">
            {split.have.map((h) => (
              <li key={h} className="text-positive">✓ {h}</li>
            ))}
            {split.have.length === 0 && <li className="text-content-faint">—</li>}
          </ul>
        </div>
        <div className="z-card p-3.5">
          <div className="text-2xs font-bold uppercase tracking-wide text-content-faint mb-1.5">You need</div>
          <ul className="text-sm space-y-0.5">
            {split.need.map((id) => (
              <li key={id} className="flex items-center justify-between gap-2">
                <span className="text-content-muted">○ {INGREDIENT_BY_ID.get(id)?.name ?? id}</span>
                <button
                  onClick={() => addPantry(id)}
                  className="text-2xs font-bold text-brand"
                  aria-label={`Add ${id} to pantry`}
                >
                  + pantry
                </button>
              </li>
            ))}
            {split.need.length === 0 && <li className="text-positive font-semibold">nothing — you're set</li>}
          </ul>
        </div>
      </section>

      <ButtonLink to={`/cook/${recipe.slug}`} size="lg" block>
        Start cooking →
      </ButtonLink>

      <section className="z-card p-4">
        <h2 className="font-bold mb-1.5">Why you'll love it</h2>
        <p className="text-sm text-content-muted leading-relaxed">{recipe.whyYoullLoveIt}</p>
      </section>

      <section>
        <h2 className="font-bold mb-2">Ingredients</h2>
        <ul className="z-card divide-y divide-line">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="px-4 py-2.5 text-sm flex items-center justify-between gap-3">
              <span className={ing.optional ? 'text-content-faint' : ''}>
                {ing.raw}
                {ing.optional && <span className="text-2xs"> · optional</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="z-card p-4">
        <h2 className="font-bold mb-2 flex items-center gap-1.5">
          <Icon name="money" size={17} className="text-caution" /> Money hack
        </h2>
        <p className="text-sm text-content-muted leading-relaxed">{recipe.moneyHack}</p>
        {recipe.swapIt && (
          <>
            <h3 className="font-bold text-sm mt-3 mb-1 flex items-center gap-1.5">
              <Icon name="shuffle" size={15} className="text-brand" /> Swap it
            </h3>
            <p className="text-sm text-content-muted leading-relaxed">{recipe.swapIt}</p>
          </>
        )}
      </section>

      <section className="z-card p-4">
        <h2 className="font-bold mb-2">
          Cost breakdown <EstimateTag />
        </h2>
        <ul className="text-sm space-y-1">
          {cost.items.map((it) => (
            <li key={it.item} className="flex justify-between">
              <span className="text-content-muted">{it.item}</span>
              <span className="tabular-nums">₹{it.costInr}</span>
            </li>
          ))}
          <li className="flex justify-between font-bold border-t border-line pt-1.5 mt-1.5">
            <span>Estimated total</span>
            <span className="tabular-nums">
              {cost.rangeLabel ?? `₹${cost.estimateInr}`}
            </span>
          </li>
        </ul>
        <p className="text-2xs text-content-faint mt-2">{cost.disclaimer}</p>
      </section>

      <section className="z-card p-4">
        <h2 className="font-bold mb-2">
          Nutrition <EstimateTag label="estimated · low confidence" />
        </h2>
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            ['kcal', recipe.nutrition.calories],
            ['protein', `${recipe.nutrition.proteinG}g`],
            ['carbs', `${recipe.nutrition.carbsG}g`],
            ['fat', `${recipe.nutrition.fatG}g`],
            ['fibre', `${recipe.nutrition.fibreG}g`],
          ].map(([label, val]) => (
            <div key={label}>
              <div className="z-stat-num text-sm">{val}</div>
              <div className="text-2xs text-content-faint">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-2xs text-content-faint mt-2">
          Estimated from ingredient quantities — the book has no nutrition data. Treat as a
          rough guide, not a medical-grade figure.
        </p>
      </section>

      {recipe.closingLine && (
        <p className="text-center text-sm italic text-content-muted px-6">"{recipe.closingLine}"</p>
      )}

      <div className="flex gap-2">
        <ButtonLink to={`/cook/${recipe.slug}`} block>Start cooking</ButtonLink>
        <Button
          variant="secondary"
          disabled={sharing}
          onClick={async () => {
            setSharing(true);
            try {
              await shareRecipe(recipe, 'discovered');
            } finally {
              setSharing(false);
            }
          }}
        >
          {sharing ? 'Preparing…' : 'Share'}
        </Button>
      </div>

      <Link to="/discover" className="block text-center text-xs font-semibold text-brand pt-2">
        ← Back to all recipes
      </Link>
    </div>
  );
}
