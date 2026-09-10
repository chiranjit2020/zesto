import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConstraintForm, NO_CONSTRAINTS, type Constraints } from '../components/ConstraintForm';
import { IngredientPicker, COMMON_INGREDIENTS } from '../components/IngredientPicker';
import { ResultsView } from '../components/ResultsView';
import { useDecisionContext } from '../app/useDecisionContext';
import { usePantry } from '../state/pantry';
import { INGREDIENT_BY_ID } from '../data/catalog';
import { Chip } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/PageHeader';
import type { DecisionContext } from '../domain/types';

export function WhatCanIMake() {
  const pantryItems = usePantry((s) => s.items);
  const addPantry = usePantry((s) => s.add);
  const [constraints, setConstraints] = useState<Constraints>(NO_CONSTRAINTS);
  const [extraIngredients, setExtra] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [relaxed, setRelaxed] = useState<DecisionContext | null>(null);

  const baseCtx = useDecisionContext(constraints);
  const ctx = useMemo<DecisionContext>(() => {
    if (relaxed) return relaxed;
    return {
      ...baseCtx,
      pantry: [...new Set([...baseCtx.pantry, ...extraIngredients])],
    };
  }, [baseCtx, extraIngredients, relaxed]);

  const usingPantry = pantryItems.map((i) => i.ingredientId);
  const allSelected = new Set([...usingPantry, ...extraIngredients]);

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="🍳"
        title="What can I make?"
        sub="From what you've got, your budget, time and energy."
      />

      <section className="z-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold">What do you have?</h2>
          <Link to="/pantry" className="text-xs font-semibold text-brand">Edit pantry</Link>
        </div>

        {allSelected.size === 0 ? (
          <p className="text-sm text-content-muted">
            Nothing selected yet — pick a few and Zesto will match against them.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {[...allSelected].map((id) => (
              <Chip
                key={id}
                active
                onClick={() => {
                  const next = new Set(extraIngredients);
                  next.delete(id);
                  setExtra(next);
                }}
              >
                {INGREDIENT_BY_ID.get(id)?.name ?? id} ✕
              </Chip>
            ))}
          </div>
        )}

        {!pickerOpen ? (
          <button
            onClick={() => setPickerOpen(true)}
            className="mt-3 text-sm font-semibold text-brand hover:underline"
          >
            + Add ingredients
          </button>
        ) : (
          <div className="mt-4">
            <IngredientPicker
              selected={allSelected}
              quickPicks={COMMON_INGREDIENTS}
              onToggle={(id) => {
                if (usingPantry.includes(id)) return; // pantry items managed in Pantry
                const next = new Set(extraIngredients);
                next.has(id) ? next.delete(id) : next.add(id);
                setExtra(next);
              }}
            />
            {extraIngredients.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  extraIngredients.forEach((id) => addPantry(id));
                  setExtra(new Set());
                }}
              >
                Save {extraIngredients.size} to my pantry
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="z-card p-4">
        <ConstraintForm value={constraints} onChange={(c) => { setConstraints(c); setRelaxed(null); }} />
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">
          {allSelected.size > 0 ? 'Your best matches' : 'Ranked for you'}
        </h2>
        <ResultsView ctx={ctx} onRelax={setRelaxed} />
      </section>
    </div>
  );
}
