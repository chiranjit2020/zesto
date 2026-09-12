import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RECIPES } from '../data/catalog';
import { generateWeekPlan, type PlanInput } from '../domain/plan';
import { usePrefs } from '../state/prefs';
import { usePantry } from '../state/pantry';
import { PageHeader } from '../components/PageHeader';
import { RangeControl, Segmented } from '../components/ui/Segmented';
import { Button } from '../components/ui/Button';
import { MetricTile } from '../components/ui/primitives';
import { Icon } from '../components/ui/Icon';
import { track } from '../lib/track';

export function Planner() {
  const prefs = usePrefs();
  const pantry = usePantry((s) => s.items.map((i) => i.ingredientId));
  const [budget, setBudget] = useState(1000);
  const [people, setPeople] = useState(prefs.servings);
  const [effort, setEffort] = useState<PlanInput['maxEffort']>('low');
  const [plan, setPlan] = useState<ReturnType<typeof generateWeekPlan> | null>(null);

  const build = () => {
    const generated = generateWeekPlan(RECIPES, {
      weeklyBudgetInr: budget,
      people,
      diet: prefs.diet,
      maxEffort: effort,
      slots: ['breakfast', 'lunch', 'dinner'],
      pantry,
    });
    setPlan(generated);
    track('planner_created', { number_of_meals: generated.meals.length, budget });
  };

  return (
    <div className="space-y-6">
      <PageHeader icon="mode-plan" title="Plan my week" onBack={undefined} />

      <section className="z-card p-4 space-y-5">
        <RangeControl label="Weekly budget" min={400} max={2500} step={50} prefix="₹" value={budget} onChange={setBudget} />
        <div>
          <div className="text-sm font-bold mb-2">People</div>
          <Segmented value={people} onChange={setPeople} options={[{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }]} />
        </div>
        <div>
          <div className="text-sm font-bold mb-2">Effort ceiling</div>
          <Segmented
            size="sm"
            value={effort}
            onChange={setEffort}
            options={[
              { value: 'very-low' as const, label: 'Very low' },
              { value: 'low' as const, label: 'Low' },
              { value: 'medium' as const, label: 'Medium' },
            ]}
          />
        </div>
        <p className="text-sm text-content-muted">
          Diet: <b className="text-content">{prefs.diet === 'any' ? 'no preference' : prefs.diet}</b>{' '}
          <Link to="/profile" className="text-brand font-semibold">change</Link>
        </p>
        <Button block size="lg" onClick={build}>Generate my week</Button>
      </section>

      {plan && (
        <>
          <section className="grid grid-cols-3 gap-2.5">
            <MetricTile value={`₹${plan.totalCostInr}`} label="week total" tone={plan.withinBudget ? 'positive' : 'warm'} />
            <MetricTile value={`₹${plan.perDayInr}`} label="per day" />
            <MetricTile value={plan.shoppingList.filter((s) => !s.alreadyHave).length} label="to buy" tone="brand" />
          </section>
          <p className="text-sm text-content-muted">{plan.note}</p>

          <section>
            <h2 className="font-bold mb-2">The week</h2>
            <div className="space-y-2">
              {groupByDay(plan.meals).map(([day, meals]) => (
                <div key={day} className="z-card p-3">
                  <div className="text-2xs font-bold uppercase tracking-wide text-content-faint mb-1.5">{day}</div>
                  <div className="space-y-1">
                    {meals.map((m) => (
                      <Link key={m.slot} to={`/r/${m.recipe.slug}`} className="flex items-center justify-between text-sm hover:text-brand">
                        <span className="capitalize text-content-muted w-20 shrink-0">{m.slot}</span>
                        <span className="flex-1 font-semibold truncate">{m.recipe.title}</span>
                        <span className="tabular-nums text-content-faint">₹{m.costInr}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-bold mb-2 flex items-center gap-1.5">
              <Icon name="cart" size={17} className="text-brand" /> Shopping list
            </h2>
            <p className="text-2xs text-content-faint mb-2">De-duplicated — buy once, use across the week.</p>
            <div className="z-card divide-y divide-line">
              {plan.shoppingList.map((line) => (
                <div key={line.ingredientId} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className={line.alreadyHave ? 'line-through text-content-faint' : 'font-semibold'}>
                    {line.name}
                  </span>
                  <span className="text-2xs text-content-faint">
                    {line.alreadyHave ? 'have it' : `${line.recipeCount} ${line.recipeCount === 1 ? 'recipe' : 'recipes'}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function groupByDay(meals: ReturnType<typeof generateWeekPlan>['meals']) {
  const map = new Map<string, typeof meals>();
  for (const m of meals) map.set(m.day, [...(map.get(m.day) ?? []), m]);
  return [...map.entries()];
}
