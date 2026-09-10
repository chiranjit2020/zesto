import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePantry, expiringSoon } from '../state/pantry';
import { IngredientPicker, COMMON_INGREDIENTS } from '../components/IngredientPicker';
import { INGREDIENT_BY_ID, recipesUsingIngredient, RECIPES } from '../data/catalog';
import { rankRecipes } from '../domain/recommend';
import { useDecisionContext } from '../app/useDecisionContext';
import { Sheet } from '../components/ui/Sheet';
import { Button } from '../components/ui/Button';
import { EmptyState, Badge, SectionHeader } from '../components/ui/primitives';
import { Icon } from '../components/ui/Icon';
import { RecipeCard } from '../components/RecipeCard';
import { relativeDay } from '../lib/format';

export function Pantry() {
  const { items, add, remove } = usePantry();
  const [sheetOpen, setSheetOpen] = useState(false);
  const ctx = useDecisionContext();

  const selected = useMemo(() => new Set(items.map((i) => i.ingredientId)), [items]);
  const expiring = useMemo(() => expiringSoon(items, 4), [items]);

  const canMake = useMemo(
    () => (items.length ? rankRecipes(RECIPES, ctx, { limit: 6, minScore: 0.4 }) : []),
    [ctx, items.length],
  );

  const mostUseful = useMemo(() => {
    return items
      .map((it) => ({ it, count: recipesUsingIngredient(it.ingredientId).length }))
      .filter((x) => x.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [items]);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const it of items) {
      const cat = INGREDIENT_BY_ID.get(it.ingredientId)?.category ?? 'other';
      map.set(cat, [...(map.get(cat) ?? []), it]);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My pantry</h1>
        <Button size="sm" onClick={() => setSheetOpen(true)}>+ Add</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="nav-pantry"
          title="Nothing here yet"
          body="Add a few ingredients and let's see what you can make."
          action={<Button onClick={() => setSheetOpen(true)}>Add ingredients</Button>}
        />
      ) : (
        <>
          {expiring.length > 0 && (
            <div className="rounded-lg border border-caution/40 bg-caution/5 shadow-card p-4">
              <div className="text-sm font-bold text-caution mb-1">Use these soon</div>
              <div className="flex flex-wrap gap-1.5">
                {expiring.map((it) => (
                  <Link key={it.id} to="/leftovers" className="z-chip !py-1.5 border-caution/40 text-caution">
                    {INGREDIENT_BY_ID.get(it.ingredientId)?.name} · {relativeDay(it.expiry!)}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {mostUseful.length > 0 && (
            <div className="space-y-1">
              {mostUseful.map(({ it, count }) => (
                <p key={it.id} className="text-sm text-content-muted flex items-start gap-1.5">
                  <Icon name="insight" size={15} className="text-caution mt-0.5 shrink-0" />
                  <span>You have <b className="text-content">{INGREDIENT_BY_ID.get(it.ingredientId)?.name}</b> — usable in {count} recipes.</span>
                </p>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {byCategory.map(([cat, list]) => (
              <div key={cat}>
                <div className="text-2xs font-bold uppercase tracking-wide text-content-faint mb-1.5 capitalize">
                  {cat.replace('-', ' ')}
                </div>
                <div className="z-card divide-y divide-line">
                  {list.map((it) => {
                    const ing = INGREDIENT_BY_ID.get(it.ingredientId);
                    return (
                      <div key={it.id} className="px-4 py-2.5 flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-semibold">{ing?.name}</span>
                          {it.expiry && (
                            <span className="text-2xs text-content-faint ml-2">
                              expires {relativeDay(it.expiry)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => remove(it.id)}
                          className="text-2xs font-bold text-content-faint hover:text-critical"
                          aria-label={`Remove ${ing?.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <section>
            <SectionHeader
              title="What you can make now"
              action={<Link to="/make" className="text-xs font-semibold text-brand">Refine</Link>}
            />
            {canMake.length === 0 ? (
              <p className="text-sm text-content-muted">
                Add one or two more staples — you're close. <Link to="/discover" className="text-brand font-semibold">Browse all</Link>
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {canMake.map((s) => (
                  <RecipeCard key={s.recipe.number} recipe={s.recipe} footnote={s.reasons[0]} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Add to pantry"
        footer={<Button block onClick={() => setSheetOpen(false)}>Done · {items.length} items</Button>}>
        <div className="py-2">
          <IngredientPicker
            selected={selected}
            quickPicks={COMMON_INGREDIENTS}
            onToggle={(id) => (selected.has(id) ? remove(items.find((i) => i.ingredientId === id)!.id) : add(id))}
          />
          <p className="text-2xs text-content-faint mt-3">
            <Badge tone="neutral">note</Badge> Salt, oil and basic spices are assumed — you don't need to add them.
          </p>
        </div>
      </Sheet>
    </div>
  );
}
