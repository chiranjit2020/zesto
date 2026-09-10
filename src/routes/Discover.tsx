import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RECIPES, CATALOG_META } from '../data/catalog';
import { filterRecipes, EMPTY_FILTERS, activeFilterCount, type RecipeFilters } from '../domain/search';
import { RecipeCard } from '../components/RecipeCard';
import { Chip, EmptyState } from '../components/ui/primitives';
import { Sheet } from '../components/ui/Sheet';
import { Segmented, RangeControl } from '../components/ui/Segmented';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { EQUIPMENT_OPTIONS } from '../state/prefs';
import type { EquipmentId } from '../domain/types';

const CHAPTERS = [...new Set(RECIPES.map((r) => r.chapter))];

export function Discover() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<RecipeFilters>(() => hydrate(params));
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setFilters(hydrate(params));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useMemo(() => filterRecipes(RECIPES, filters), [filters]);
  const count = activeFilterCount(filters);

  const patch = (p: Partial<RecipeFilters>) => setFilters((f) => ({ ...f, ...p }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Discover</h1>
      <p className="text-sm text-content-muted -mt-2">
        All {String(CATALOG_META.recipe_count)} recipes from the book. Works offline.
      </p>

      <input
        type="search"
        value={filters.query}
        onChange={(e) => patch({ query: e.target.value })}
        placeholder="Search recipes, ingredients…"
        className="w-full rounded-full border border-line bg-surface-raised px-4 py-3 text-sm focus:border-brand outline-none"
        aria-label="Search recipes"
      />

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
        <button onClick={() => setSheetOpen(true)} className="z-chip z-tap !py-2 border-brand/40 text-brand">
          <Icon name="checklist" size={14} />
          Filters{count > 0 ? ` · ${count}` : ''}
        </button>
        <Chip active={filters.maxCostInr === 30} onClick={() => patch({ maxCostInr: filters.maxCostInr === 30 ? null : 30 })}>Under ₹30</Chip>
        <Chip active={filters.maxTimeMinutes === 15} onClick={() => patch({ maxTimeMinutes: filters.maxTimeMinutes === 15 ? null : 15 })}>15 min</Chip>
        <Chip active={filters.noCook} onClick={() => patch({ noCook: !filters.noCook })}>No cooking</Chip>
        <Chip active={filters.diet === 'vegetarian'} onClick={() => patch({ diet: filters.diet === 'vegetarian' ? 'any' : 'vegetarian' })}>Veg</Chip>
        <Chip active={filters.highProtein} onClick={() => patch({ highProtein: !filters.highProtein })}>High protein</Chip>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-content-muted">
        <span className="shrink-0">
          {results.length} {results.length === 1 ? 'recipe' : 'recipes'}
        </span>
        <Segmented
          size="sm"
          className="min-w-0"
          value={filters.sort}
          onChange={(v) => patch({ sort: v })}
          options={[
            { value: 'relevance' as const, label: 'Best' },
            { value: 'cost' as const, label: '₹' },
            { value: 'time' as const, label: 'Time' },
            { value: 'effort' as const, label: 'Effort' },
          ]}
        />
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon="search"
          title="No recipes match"
          body="Loosen a filter or clear the search."
          action={<Button variant="secondary" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear all</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {results.map((r) => (
            <RecipeCard key={r.number} recipe={r} />
          ))}
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setFilters({ ...EMPTY_FILTERS, query: filters.query }); }}>
              Clear
            </Button>
            <Button block onClick={() => { setParams(serialise(filters)); setSheetOpen(false); }}>
              Show {results.length} recipes
            </Button>
          </div>
        }
      >
        <div className="space-y-6 py-2">
          <RangeControl
            label="Max cost"
            min={8}
            max={99}
            step={1}
            prefix="₹"
            value={filters.maxCostInr ?? 99}
            onChange={(v) => patch({ maxCostInr: v >= 99 ? null : v })}
          />
          <RangeControl
            label="Max time"
            min={4}
            max={30}
            step={1}
            suffix=" min"
            value={filters.maxTimeMinutes ?? 30}
            onChange={(v) => patch({ maxTimeMinutes: v >= 30 ? null : v })}
          />
          <div>
            <div className="text-sm font-bold mb-2">Diet</div>
            <Segmented
              value={filters.diet}
              onChange={(v) => patch({ diet: v })}
              options={[
                { value: 'any' as const, label: 'Any' },
                { value: 'vegetarian' as const, label: 'Vegetarian' },
                { value: 'egg' as const, label: 'Egg' },
              ]}
            />
          </div>
          <div>
            <div className="text-sm font-bold mb-2">Cook with only</div>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_OPTIONS.map((e) => {
                const active = filters.equipment.includes(e.id);
                return (
                  <Chip
                    key={e.id}
                    active={active}
                    onClick={() =>
                      patch({
                        equipment: active
                          ? filters.equipment.filter((x) => x !== e.id)
                          : ([...filters.equipment, e.id] as EquipmentId[]),
                      })
                    }
                  >
                    <Icon name={e.icon} size={15} className="-ml-0.5" /> {e.label}
                  </Chip>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold mb-2">Calories · estimated</div>
            <div className="flex flex-wrap gap-1.5">
              {([[0, 300], [300, 500], [500, 700], [700, 1000]] as [number, number][]).map((b) => (
                <Chip
                  key={b.join()}
                  active={JSON.stringify(filters.calorieBand) === JSON.stringify(b)}
                  onClick={() => patch({ calorieBand: JSON.stringify(filters.calorieBand) === JSON.stringify(b) ? null : b })}
                >
                  {b[0] === 0 ? `Under ${b[1]}` : `${b[0]}–${b[1]}`}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold mb-2">Chapter</div>
            <div className="flex flex-wrap gap-1.5">
              {CHAPTERS.map((c) => (
                <Chip
                  key={c}
                  active={filters.chapters.includes(c)}
                  onClick={() =>
                    patch({
                      chapters: filters.chapters.includes(c)
                        ? filters.chapters.filter((x) => x !== c)
                        : [...filters.chapters, c],
                    })
                  }
                >
                  {c.replace(/ *[—–].*/, '').replace(/\/.*/, '').slice(0, 22)}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function hydrate(p: URLSearchParams): RecipeFilters {
  return {
    ...EMPTY_FILTERS,
    query: p.get('q') ?? '',
    maxCostInr: p.get('maxCost') ? Number(p.get('maxCost')) : null,
    maxTimeMinutes: p.get('maxTime') ? Number(p.get('maxTime')) : null,
    equipment: p.get('equipment') ? (p.get('equipment')!.split(',') as EquipmentId[]) : [],
    diet: (p.get('diet') as RecipeFilters['diet']) ?? 'any',
    noCook: p.get('noCook') === '1',
    highProtein: p.get('highProtein') === '1',
  };
}

function serialise(f: RecipeFilters): Record<string, string> {
  const o: Record<string, string> = {};
  if (f.query) o.q = f.query;
  if (f.maxCostInr) o.maxCost = String(f.maxCostInr);
  if (f.maxTimeMinutes) o.maxTime = String(f.maxTimeMinutes);
  if (f.equipment.length) o.equipment = f.equipment.join(',');
  if (f.diet !== 'any') o.diet = f.diet;
  if (f.noCook) o.noCook = '1';
  if (f.highProtein) o.highProtein = '1';
  return o;
}
