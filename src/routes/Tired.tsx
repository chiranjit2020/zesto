import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { MatchCard } from '../components/RecipeCard';
import { EmptyState, Chip } from '../components/ui/primitives';
import { RECIPES, CURATED_LISTS } from '../data/catalog';
import { rankRecipes } from '../domain/recommend';
import { useDecisionContext } from '../app/useDecisionContext';
import type { EquipmentId } from '../domain/types';

const MODES: { id: string; label: string; equipment: EquipmentId[] | null; noCook?: boolean }[] = [
  { id: 'none', label: 'Literally none', equipment: ['no-cook'], noCook: true },
  { id: 'bowl', label: 'One bowl', equipment: ['no-cook', 'microwave', 'kettle'] },
  { id: 'pan', label: 'One pan', equipment: ['one-pan'] },
  { id: 'any', label: "I'll manage", equipment: null },
];

export function Tired() {
  const [mode, setMode] = useState('none');
  const picked = MODES.find((m) => m.id === mode)!;
  const ctx = useDecisionContext(
    { maxEffort: mode === 'any' ? 'low' : 'very-low', equipment: picked.equipment },
    { noCookOnly: picked.noCook, preferredNumbers: CURATED_LISTS['situational:too-tired'] },
  );

  const results = useMemo(
    () => rankRecipes(RECIPES, { ...ctx }, { limit: 10, minScore: 0.1 })
      .sort((a, b) => a.recipe.effort.score - b.recipe.effort.score || b.score - a.score),
    [ctx],
  );

  return (
    <div className="space-y-6">
      <PageHeader icon="mode-tired" iconMotion="pulse" title="Too tired to cook" sub="Effort first, not just time. Fewer dishes is the point." />

      <div className="z-card p-4">
        <label className="text-sm font-bold block mb-2">How much effort are you willing to make?</label>
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <Chip key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState icon="mode-tired" title="Even that's too much right now?" body="Try 'One bowl' — those need almost nothing." />
      ) : (
        <div className="space-y-3">
          {results.map((s, i) => (
            <MatchCard key={s.recipe.number} scored={s} rank={i} />
          ))}
        </div>
      )}
    </div>
  );
}
