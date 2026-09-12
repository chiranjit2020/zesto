import type { MealHistoryEntry } from './types.js';

/**
 * Pure meal-history helper — split out of `src/state/kitchen.ts` (which re-exports it
 * unchanged for existing callers) for the same reason as `src/domain/pantry.ts`: needs
 * to be importable from `api/` (Phase 6's dispatch.ts) without dragging in the zustand
 * store, which touches `localStorage` at module load and would crash under Node.
 */
export function recentlyCookedNumbers(history: MealHistoryEntry[], days = 3, now = Date.now()): number[] {
  const cutoff = now - days * 86400000;
  return history.filter((h) => new Date(h.cookedAt).getTime() >= cutoff).map((h) => h.recipeNumber);
}
