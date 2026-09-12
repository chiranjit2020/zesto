import type { WeekStats } from './kitchenHistory.js';

/**
 * Weekly Zesto summary — architecture only, per spec §21: "prepare the architecture...
 * even if the first implementation only prepares the data model." This is that: a pure
 * template over the *existing* `WeekStats` shape (`computeWeekStats`, already used by
 * `Profile.tsx`'s "This week" dashboard) — spec explicitly warns "do not fabricate
 * values," so this reuses the same computation the UI already trusts rather than
 * inventing a second, server-side version of it.
 *
 * Deliberately NOT wired into `api/notifications/dispatch.ts`'s live send loop yet.
 * Doing that needs one more piece dispatch.ts doesn't have: a *weekly*, not 3-hour,
 * cooldown (`CATEGORY_COOLDOWN_MS` there is tuned for meal-ish cadence). The natural
 * hook, when that's built: classify as `type: 'weekly-summary'`, gated by
 * `preferences.smart.weeklySummary` (already a real toggle since Phase 4's UI), eligible
 * once local time is in a "weekly digest" window (e.g. Sunday evening) AND no
 * `notificationHistory` row of this type exists for this device in the last 7 days —
 * `dispatch.ts` already loads a `mealHistorySnapshots` doc per device, which is all
 * `computeWeekStats` needs, so no new collection or sync path is required at all.
 */

/**
 * `null` when there's nothing genuine to report (spec's "do not fabricate values" reads
 * equally as "don't send an empty celebration" — a week with zero cooked meals gets no
 * summary at all, matching spec §14's "silence beats noise" preference generally).
 */
export function weeklySummaryTemplate(stats: WeekStats): { title: string; body: string } | null {
  if (stats.mealsCooked === 0) return null;

  const parts = [
    `${stats.mealsCooked} meal${stats.mealsCooked === 1 ? '' : 's'} cooked`,
    `₹${stats.moneySpentInr} estimated spend`,
  ];
  if (stats.estCalories > 0) parts.push(`${stats.estCalories.toLocaleString('en-IN')} estimated kcal`);
  if (stats.leftoversRescued > 0) {
    parts.push(`${stats.leftoversRescued} pantry ingredient${stats.leftoversRescued === 1 ? '' : 's'} rescued`);
  }
  if (stats.estimatedSavedInr > 0) parts.push(`₹${stats.estimatedSavedInr} estimated savings`);

  return {
    title: 'Your week with Zesto 🍳',
    body: parts.join(' · '),
  };
}
