import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePrefs, DIETS, EQUIPMENT_OPTIONS } from '../state/prefs';
import { useKitchen, computeWeekStats, cookingStreakDays } from '../state/kitchen';
import { usePantry } from '../state/pantry';
import { RECIPE_BY_NUMBER } from '../data/catalog';
import { MetricTile, SectionHeader, Chip, EmptyState, Badge } from '../components/ui/primitives';
import { Segmented } from '../components/ui/Segmented';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { RecipeCard } from '../components/RecipeCard';
import { NotificationsSettings } from '../components/NotificationsSettings';
import { NotificationHistory } from '../components/NotificationHistory';
import { useNotifications } from '../state/notifications';
import { rupee2, relativeDay } from '../lib/format';
import { CHALLENGES, challengeProgress } from '../domain/challenges';
import { useInstallPrompt } from '../app/useInstallPrompt';

export function Profile() {
  const prefs = usePrefs();
  const { history, favorites, clear } = useKitchen();
  const pantryCount = usePantry((s) => s.items.length);
  const install = useInstallPrompt();
  const notificationsEnabled = useNotifications((s) => s.enabled);

  const stats = useMemo(() => computeWeekStats(history), [history]);
  const streak = useMemo(() => cookingStreakDays(history), [history]);
  const favRecipes = favorites.map((n) => RECIPE_BY_NUMBER.get(n)).filter(Boolean);
  const recent = history.slice(0, 6);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">You</h1>

      {install.available && (
        <div className="z-card p-4 grad-brand text-white flex items-center justify-between gap-3">
          <div>
            <div className="font-bold">Install Zesto</div>
            <div className="text-xs opacity-90">Full screen, works offline, opens like an app.</div>
          </div>
          <Button variant="secondary" size="sm" onClick={install.prompt}>Install</Button>
        </div>
      )}

      {/* ---- weekly dashboard (§14) ---- */}
      <section>
        <SectionHeader
          title="This week"
          sub={streak > 0 ? `${streak}-day cooking streak` : 'Cook something to start your streak'}
          action={streak > 0 ? <Icon name="streak" size={18} className="text-caution" /> : undefined}
        />
        {stats.mealsCooked === 0 ? (
          <EmptyState icon="trend" title="No meals logged yet" body="Finish a recipe in cooking mode and it lands here." />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <MetricTile value={stats.mealsCooked} label="meals cooked" tone="brand" />
              <MetricTile value={`₹${stats.moneySpentInr}`} label="spent" />
              <MetricTile value={`~${stats.estCalories.toLocaleString('en-IN')}`} label="est. kcal" sub="estimated" />
              <MetricTile value={rupee2(stats.avgMealInr)} label="avg / meal" />
              <MetricTile value={`₹${stats.estimatedSavedInr}`} label="est. saved" tone="positive" sub="vs ordering" />
              <MetricTile value={stats.leftoversRescued} label="leftovers rescued" tone="positive" />
            </div>
            {stats.insights.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {stats.insights.map((i) => (
                  <li key={i} className="text-sm text-content-muted">→ {i}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* ---- challenges (§34) ---- */}
      <section>
        <SectionHeader title="Challenges" />
        <div className="space-y-2">
          {CHALLENGES.map((c) => {
            const p = challengeProgress(c, history);
            return (
              <div key={c.id} className="z-card p-3.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <Icon name={c.icon} size={16} className="text-caution shrink-0" />
                    {c.title}
                  </div>
                  {p.done ? <Badge tone="positive">done</Badge> : <span className="text-2xs text-content-faint">{p.current}/{c.target}</span>}
                </div>
                <p className="text-2xs text-content-faint mt-0.5">{c.description}</p>
                <div className="mt-2 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                  <div className="h-full grad-warm transition-all" style={{ width: `${Math.min(100, (p.current / c.target) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <SectionHeader title="Recently cooked" />
          <div className="z-card divide-y divide-line">
            {recent.map((h) => {
              const r = RECIPE_BY_NUMBER.get(h.recipeNumber);
              if (!r) return null;
              return (
                <Link key={h.id} to={`/r/${r.slug}`} className="px-4 py-2.5 flex items-center justify-between text-sm hover:text-brand">
                  <span className="font-semibold">{r.title}</span>
                  <span className="text-2xs text-content-faint">
                    {relativeDay(h.cookedAt)} · ₹{h.actualCostInr ?? r.costInr}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {favRecipes.length > 0 && (
        <section>
          <SectionHeader title="Favorites" />
          <div className="grid grid-cols-2 gap-2.5">
            {favRecipes.map((r) => r && <RecipeCard key={r.number} recipe={r} />)}
          </div>
        </section>
      )}

      <NotificationsSettings />

      <NotificationHistory />

      {/* ---- preferences (§28) ---- */}
      <section>
        <SectionHeader title="Preferences" sub={`${pantryCount} pantry items · explore without an account`} />
        <div className="z-card p-4 space-y-5">
          <div>
            <div className="text-sm font-bold mb-2">Diet</div>
            <Segmented
              size="sm"
              value={prefs.diet}
              onChange={(v) => prefs.set({ diet: v })}
              options={DIETS.map((d) => ({ value: d.id, label: d.label }))}
            />
          </div>
          <div>
            <div className="text-sm font-bold mb-2">Servings by default</div>
            <Segmented value={prefs.servings} onChange={(v) => prefs.set({ servings: v })} options={[{ value: 1, label: '1' }, { value: 2, label: '2' }]} />
          </div>
          <div>
            <div className="text-sm font-bold mb-2">Equipment I own</div>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_OPTIONS.map((e) => (
                <Chip key={e.id} active={prefs.equipmentOwned.includes(e.id)} onClick={() => prefs.toggleEquipment(e.id)}>
                  <Icon name={e.icon} size={15} className="-ml-0.5" /> {e.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold mb-2">Theme</div>
            <Segmented
              size="sm"
              value={prefs.theme}
              onChange={(v) => prefs.set({ theme: v })}
              options={[
                { value: 'light' as const, label: 'Light' },
                { value: 'dark' as const, label: 'Dark' },
                { value: 'system' as const, label: 'System' },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader
          title="Data"
          sub={
            notificationsEnabled
              ? 'Mostly stored on this device — pantry, cooking history & preferences also sync to our server so smart notifications work'
              : 'Everything is stored on this device only'
          }
        />
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (confirm('Clear cooking history and favorites? Pantry and preferences stay.')) clear();
          }}
        >
          Clear history & favorites
        </Button>
        <p className="text-2xs text-content-faint pt-2">
          Content from <i>"99 Recipes Under ₹99"</i>. Costs and calories are estimates, not guarantees.{' '}
          <Link to="/about" className="text-brand font-semibold">About</Link>
        </p>
      </section>
    </div>
  );
}
