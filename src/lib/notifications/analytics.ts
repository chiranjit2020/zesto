import { logEvent } from 'firebase/analytics';
import { getAnalyticsIfSupported } from './firebase';

/**
 * Firebase Analytics events (spec §19/§20's funnel) — a thin, fire-and-forget wrapper,
 * dynamically imported by every caller so the Analytics SDK never touches the initial
 * bundle for users who haven't opted into notifications, same rationale as
 * src/lib/notifications/foreground.ts.
 *
 * Real gap, not silently skipped: the Analytics Web SDK expects a normal window/tab
 * context (gtag.js, IndexedDB, cookies) and isn't reliably usable from a service
 * worker's global scope — so it's never called from src/sw.ts. That means
 * `notification_received` (a push arriving while the app is backgrounded or closed)
 * and `notification_dismissed` (closed without a click, which only `notificationclose`
 * in the SW can see) have no analytics signal from this app. `notification_opened` is
 * covered — that fires from the tab, once reopened, via `useNotificationOpenTracking`
 * in App.tsx.
 */
export function track(name: string, params?: Record<string, unknown>): void {
  getAnalyticsIfSupported()
    .then((analytics) => {
      if (analytics) logEvent(analytics, name, params);
    })
    .catch(() => {});
}
