import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ResultsView } from '../components/ResultsView';
import { Chip } from '../components/ui/primitives';
import { useDecisionContext } from '../app/useDecisionContext';
import { INGREDIENT_BY_ID } from '../data/catalog';
import type { DecisionContext } from '../domain/types';

/** Common leftover items students actually have at 9pm (§20). */
const LEFTOVERS = [
  'rice', 'roti', 'moong-dal', 'toor-dal', 'leftover-sabzi', 'boiled-chickpeas',
  'rajma', 'maggi-noodles', 'bread', 'potato', 'paneer',
];

export function Leftovers() {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [relaxed, setRelaxed] = useState<DecisionContext | null>(null);
  const ctx = useDecisionContext(
    {},
    { leftoverIngredients: [...picked], pantry: [] },
  );
  // merge leftovers into pantry so ingredient match still works
  const finalCtx = useMemo<DecisionContext>(
    () => (relaxed ? relaxed : { ...ctx, pantry: [...new Set([...ctx.pantry, ...picked])] }),
    [ctx, picked, relaxed],
  );

  return (
    <div className="space-y-6">
      <PageHeader icon="mode-leftovers" iconMotion="spin" title="Use my leftovers" sub="Turn what's already cooked into another meal." />

      <div className="z-card p-4">
        <h2 className="text-sm font-bold mb-2">What's sitting in the fridge?</h2>
        <div className="flex flex-wrap gap-1.5">
          {LEFTOVERS.map((id) => (
            <Chip
              key={id}
              active={picked.has(id)}
              onClick={() => {
                const next = new Set(picked);
                next.has(id) ? next.delete(id) : next.add(id);
                setPicked(next);
                setRelaxed(null);
              }}
            >
              {INGREDIENT_BY_ID.get(id)?.name ?? id}
            </Chip>
          ))}
        </div>
      </div>

      {picked.size > 0 && (
        <p className="text-center font-bold text-positive">You can rescue this.</p>
      )}

      <ResultsView ctx={finalCtx} onRelax={setRelaxed} emptyIcon="mode-leftovers" />
    </div>
  );
}
