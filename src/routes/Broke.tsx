import { useState } from 'react';
import { ResultsView } from '../components/ResultsView';
import { useDecisionContext } from '../app/useDecisionContext';
import { PageHeader } from '../components/PageHeader';
import { CURATED_LISTS } from '../data/catalog';
import type { DecisionContext } from '../domain/types';

export function Broke() {
  const [budget, setBudget] = useState(20);
  const [relaxed, setRelaxed] = useState<DecisionContext | null>(null);
  const ctx = useDecisionContext(
    { budgetInr: budget },
    {
      preferredNumbers: [
        ...CURATED_LISTS['situational:filling-cheap'],
        ...CURATED_LISTS['situational:last-week-of-month'],
      ],
    },
  );

  return (
    <div className="space-y-6">
      <PageHeader emoji="🪙" title="Only got a little?" sub="No judgement. Zesto finds what you can make." />

      <div className="z-card p-5 text-center grad-warm text-ink">
        <div className="text-sm font-bold">I've got about</div>
        <div className="z-stat-num text-4xl my-1">₹{budget}</div>
        <div className="flex justify-center flex-wrap gap-1.5 mt-3">
          {[10, 20, 30, 50].map((b) => (
            <button
              key={b}
              onClick={() => { setBudget(b); setRelaxed(null); }}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                budget === b ? 'bg-ink text-white' : 'bg-white/40 text-ink hover:bg-white/60'
              }`}
            >
              ₹{b}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-content-faint text-center">
        Costs are estimated from the portion used — real prices move with your shop and city.
      </p>

      <ResultsView ctx={relaxed ?? ctx} onRelax={setRelaxed} emptyIcon="🪙" />
    </div>
  );
}
