import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { RecipeCard } from '../components/RecipeCard';
import { Chip, EmptyState } from '../components/ui/primitives';
import { RECIPES, INGREDIENT_BY_ID } from '../data/catalog';

/**
 * The ₹99 Emergency Meal Formula (PDF p14, §21): BASE + PROTEIN + VEGETABLE + FLAVOUR.
 * Rule-based: pick one from each column, Zesto surfaces book recipes that use that combo.
 */
const COLUMNS: { key: string; label: string; options: string[] }[] = [
  { key: 'base', label: 'Base', options: ['rice', 'roti', 'bread', 'maggi-noodles', 'poha'] },
  { key: 'protein', label: 'Protein', options: ['egg', 'moong-dal', 'toor-dal', 'paneer', 'curd', 'boiled-chickpeas', 'peanuts'] },
  { key: 'vegetable', label: 'Vegetable', options: ['onion', 'tomato', 'potato', 'capsicum', 'peas', 'carrot', 'spinach'] },
  { key: 'flavour', label: 'Flavour', options: ['green-chilli', 'garlic', 'chaat-masala', 'soy-sauce', 'ketchup', 'lemon', 'curry-leaves'] },
];

export function Improviser() {
  const [pick, setPick] = useState<Record<string, string | null>>({
    base: null,
    protein: null,
    vegetable: null,
    flavour: null,
  });

  const chosen = Object.values(pick).filter(Boolean) as string[];

  const matches = useMemo(() => {
    if (chosen.length === 0) return [];
    return RECIPES.map((r) => {
      const hits = chosen.filter(
        (id) => r.keyIngredients.includes(id) || r.stapleIngredients.includes(id),
      ).length;
      return { r, hits };
    })
      .filter((x) => x.hits >= Math.min(2, chosen.length))
      .sort((a, b) => b.hits - a.hits || a.r.costInr - b.r.costInr)
      .slice(0, 6)
      .map((x) => x.r);
  }, [chosen]);

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="🧪"
        title="Make your own ₹99 meal"
        sub="Pick one from each column. Almost always lands on something edible, filling and cheap."
      />

      <div className="space-y-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="z-card p-4">
            <div className="text-2xs font-bold uppercase tracking-wide text-content-faint mb-2">
              {col.label}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {col.options.map((id) => (
                <Chip
                  key={id}
                  active={pick[col.key] === id}
                  onClick={() =>
                    setPick((p) => ({ ...p, [col.key]: p[col.key] === id ? null : id }))
                  }
                >
                  {INGREDIENT_BY_ID.get(id)?.name ?? id}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>

      {chosen.length > 0 && (
        <div className="text-center font-bold text-lg z-gradient-text">
          {chosen.map((id) => INGREDIENT_BY_ID.get(id)?.name).join(' + ')}
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold mb-3">Recipes that match your combo</h2>
        {matches.length === 0 ? (
          <EmptyState
            icon="🧪"
            title={chosen.length === 0 ? 'Build a combo above' : 'No exact match in the book'}
            body={
              chosen.length === 0
                ? 'Pick a base and a protein to start.'
                : 'That combo still works freehand — sauté the veg, add the protein, then the base, season with your flavour, done.'
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {matches.map((r) => (
              <RecipeCard key={r.number} recipe={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
