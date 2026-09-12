import { usePantry } from '../../state/pantry';
import { useKitchen } from '../../state/kitchen';

/**
 * Opt-in pantry + meal-history sync to the Vercel API (docs/NOTIFICATIONS_PLAN.md §9 Q3).
 * Phase 6's server-side dispatcher needs this — pantry and cooking history otherwise
 * live only in this browser's `localStorage`, which a scheduled function can't read, so
 * without this sync the recommendation engine has nothing to score notifications against.
 *
 * Only ever started while notifications are enabled — see `useDataSync()` in App.tsx —
 * and every push is fire-and-forget, same posture as the rest of src/lib/notifications:
 * a failed sync must never surface as a broken app, just stale server-side data until
 * the next successful one.
 *
 * Not yet implemented: deleting the synced snapshot when notifications are turned back
 * off. The last-synced copy stays server-side (stale, unused by anything once disabled)
 * until overwritten — a real gap against "everything is stored on this device only"
 * once a user has opted in and back out, tracked here rather than silently ignored.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
const DEBOUNCE_MS = 3000;

function post(path: string, body: unknown) {
  if (!BASE_URL) return;
  fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

/** Starts syncing; returns a cleanup function that stops it (call on disable/unmount). */
export function startDataSync(deviceId: string): () => void {
  if (!BASE_URL) return () => {};

  let pantryTimer: ReturnType<typeof setTimeout> | null = null;
  let historyTimer: ReturnType<typeof setTimeout> | null = null;

  const syncPantry = () => post('/api/sync/pantry', { deviceId, items: usePantry.getState().items });
  const syncHistory = () => post('/api/sync/meal-history', { deviceId, entries: useKitchen.getState().history });

  const unsubPantry = usePantry.subscribe(() => {
    if (pantryTimer) clearTimeout(pantryTimer);
    pantryTimer = setTimeout(syncPantry, DEBOUNCE_MS);
  });
  const unsubKitchen = useKitchen.subscribe(() => {
    if (historyTimer) clearTimeout(historyTimer);
    historyTimer = setTimeout(syncHistory, DEBOUNCE_MS);
  });

  // Push whatever already exists right away — don't wait for the first edit after
  // enabling, or a user who enables notifications with a pantry already stocked would
  // get no smart notifications until they touched the pantry again.
  syncPantry();
  syncHistory();

  return () => {
    if (pantryTimer) clearTimeout(pantryTimer);
    if (historyTimer) clearTimeout(historyTimer);
    unsubPantry();
    unsubKitchen();
  };
}
