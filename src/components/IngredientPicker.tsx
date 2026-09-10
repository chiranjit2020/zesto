import { useMemo, useState } from 'react';
import { INGREDIENTS, NON_STAPLE_INGREDIENTS } from '../data/catalog';
import type { Ingredient } from '../domain/types';
import { Chip } from './ui/primitives';

const CATEGORY_ORDER: Ingredient['category'][] = [
  'protein', 'pulse', 'grain', 'vegetable', 'dairy', 'fruit', 'herb', 'oil-fat',
  'condiment', 'sweetener', 'snack', 'pantry', 'spice', 'seasoning', 'leftover', 'other',
];

const CATEGORY_LABEL: Record<string, string> = {
  protein: 'Protein', pulse: 'Dal & pulses', grain: 'Bases & grains', vegetable: 'Vegetables',
  dairy: 'Dairy', fruit: 'Fruit', herb: 'Herbs', 'oil-fat': 'Fats', condiment: 'Sauces',
  sweetener: 'Sweet', snack: 'Snacks', pantry: 'Pantry', spice: 'Spices', seasoning: 'Seasoning',
  leftover: 'Leftovers', other: 'Other',
};

export function IngredientPicker({
  selected,
  onToggle,
  includeStaples = false,
  quickPicks,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  includeStaples?: boolean;
  quickPicks?: string[];
}) {
  const [query, setQuery] = useState('');
  const pool = includeStaples ? INGREDIENTS : NON_STAPLE_INGREDIENTS;

  const grouped = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = q ? pool.filter((i) => i.name.toLowerCase().includes(q) || i.id.includes(q)) : pool;
    const map = new Map<string, Ingredient[]>();
    for (const ing of filtered) {
      const arr = map.get(ing.category) ?? [];
      arr.push(ing);
      map.set(ing.category, arr);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: (map.get(c) ?? []).sort((a, b) => b.usedInCount - a.usedInCount),
    }));
  }, [query, pool]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search ingredients…"
        className="w-full rounded-full border border-line bg-surface-raised px-4 py-2.5 text-sm
          focus:border-brand outline-none"
        aria-label="Search ingredients"
      />

      {quickPicks && quickPicks.length > 0 && !query && (
        <div className="mt-3">
          <div className="text-2xs font-bold uppercase tracking-wide text-content-faint mb-1.5">
            Most common
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPicks.map((id) => {
              const ing = INGREDIENTS.find((i) => i.id === id);
              if (!ing) return null;
              return (
                <Chip key={id} active={selected.has(id)} onClick={() => onToggle(id)}>
                  {ing.name}
                </Chip>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-4 max-h-[46dvh] overflow-y-auto pr-1">
        {grouped.map(({ category, items }) => (
          <div key={category}>
            <div className="text-2xs font-bold uppercase tracking-wide text-content-faint mb-1.5">
              {CATEGORY_LABEL[category] ?? category}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((ing) => (
                <Chip key={ing.id} active={selected.has(ing.id)} onClick={() => onToggle(ing.id)}>
                  {ing.name}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const COMMON_INGREDIENTS = [
  'egg', 'onion', 'tomato', 'potato', 'rice', 'bread', 'roti', 'maggi-noodles',
  'curd', 'milk', 'paneer', 'besan', 'poha', 'rolled-oats', 'boiled-chickpeas',
  'peanuts', 'banana', 'green-chilli', 'garlic', 'peas',
];
