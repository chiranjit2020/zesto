import { useState } from 'react';
import type { EffortLevel, EquipmentId } from '../domain/types';
import { Segmented, RangeControl } from './ui/Segmented';
import { Chip } from './ui/primitives';
import { EQUIPMENT_OPTIONS } from '../state/prefs';

export interface Constraints {
  budgetInr: number | null;
  timeMinutes: number | null;
  maxEffort: EffortLevel | null;
  equipment: EquipmentId[] | null;
  calorieBand: [number, number] | null;
}

export const NO_CONSTRAINTS: Constraints = {
  budgetInr: null,
  timeMinutes: null,
  maxEffort: null,
  equipment: null,
  calorieBand: null,
};

const BUDGETS = [10, 20, 30, 50, 99];
const TIMES = [5, 10, 15, 20];
const CAL_BANDS: { label: string; band: [number, number] }[] = [
  { label: 'Under 300', band: [0, 300] },
  { label: '300–500', band: [300, 500] },
  { label: '500–700', band: [500, 700] },
  { label: '700–1000', band: [700, 1000] },
];

/**
 * Progressive disclosure (§45): budget first, then optionally time, effort, equipment,
 * calories. The default experience stays fast — you can tap one recommendation with
 * nothing but a budget set.
 */
export function ConstraintForm({
  value,
  onChange,
  startExpanded = false,
}: {
  value: Constraints;
  onChange: (c: Constraints) => void;
  startExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(startExpanded);
  const set = (patch: Partial<Constraints>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-bold block mb-2">How much do you want to spend?</label>
        <div className="flex flex-wrap gap-1.5">
          {BUDGETS.map((b) => (
            <Chip key={b} active={value.budgetInr === b} onClick={() => set({ budgetInr: value.budgetInr === b ? null : b })}>
              ₹{b}
            </Chip>
          ))}
          <Chip active={value.budgetInr != null && !BUDGETS.includes(value.budgetInr)} onClick={() => set({ budgetInr: 45 })}>
            Custom
          </Chip>
        </div>
        {value.budgetInr != null && !BUDGETS.includes(value.budgetInr) && (
          <div className="mt-3">
            <RangeControl label="Budget" min={8} max={150} step={1} value={value.budgetInr} prefix="₹" onChange={(v) => set({ budgetInr: v })} />
          </div>
        )}
      </div>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="text-sm font-semibold text-brand hover:underline"
        >
          + Add time, effort or equipment
        </button>
      ) : (
        <div className="space-y-5 animate-rise">
          <div>
            <label className="text-sm font-bold block mb-2">How much time?</label>
            <div className="flex flex-wrap gap-1.5">
              {TIMES.map((t) => (
                <Chip key={t} active={value.timeMinutes === t} onClick={() => set({ timeMinutes: value.timeMinutes === t ? null : t })}>
                  {t} min
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold block mb-2">How much effort?</label>
            <Segmented
              size="sm"
              value={value.maxEffort}
              onChange={(v) => set({ maxEffort: v === value.maxEffort ? null : v })}
              options={[
                { value: 'very-low' as const, label: 'Barely any' },
                { value: 'low' as const, label: 'A little' },
                { value: 'medium' as const, label: "I'm up for it" },
              ]}
            />
          </div>

          <div>
            <label className="text-sm font-bold block mb-2">What can you cook with?</label>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_OPTIONS.map((e) => {
                const list = value.equipment ?? [];
                const active = list.includes(e.id);
                return (
                  <Chip
                    key={e.id}
                    active={active}
                    onClick={() =>
                      set({
                        equipment: active
                          ? list.filter((x) => x !== e.id).length
                            ? list.filter((x) => x !== e.id)
                            : null
                          : [...list, e.id],
                      })
                    }
                  >
                    {e.emoji} {e.label}
                  </Chip>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold block mb-2">
              Calories <span className="text-2xs font-medium text-content-faint">· estimated</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CAL_BANDS.map((c) => (
                <Chip
                  key={c.label}
                  active={JSON.stringify(value.calorieBand) === JSON.stringify(c.band)}
                  onClick={() =>
                    set({ calorieBand: JSON.stringify(value.calorieBand) === JSON.stringify(c.band) ? null : c.band })
                  }
                >
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
