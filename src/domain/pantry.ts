import type { PantryItem } from './types.js';
import { STAPLE_IDS } from '../data/catalog.js';

/**
 * Pure pantry helpers — split out of `src/state/pantry.ts` (which re-exports both,
 * unchanged, for existing callers) so they're importable from `api/` without dragging
 * in the zustand store: `state/pantry.ts` calls `persist(...)`, which touches
 * `localStorage` at module load and would crash under Node (api/notifications/
 * dispatch.ts, Phase 6). This file has no such dependency.
 */

/** canonical ids for the decision engine: what the user owns + assumed staples */
export function pantryContextIds(items: PantryItem[]): string[] {
  return [...new Set([...items.map((i) => i.ingredientId), ...STAPLE_IDS])];
}

export function expiringSoon(items: PantryItem[], withinDays = 3): PantryItem[] {
  const cutoff = Date.now() + withinDays * 86400000;
  return items
    .filter((i) => i.expiry && new Date(i.expiry).getTime() <= cutoff)
    .sort((a, b) => new Date(a.expiry!).getTime() - new Date(b.expiry!).getTime());
}
