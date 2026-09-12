import { logEvent } from 'firebase/analytics';
import { getAnalyticsIfSupported } from './firebase';

/**
 * The app's one analytics entry point (docs/ANALYTICS_FEEDBACK_PLAN.md) — a thin,
 * fire-and-forget wrapper, dynamically imported by every caller so the Analytics SDK
 * never sits in the initial bundle's critical path (spec: "must not noticeably slow
 * down Zesto," "do not block page rendering"). Every event in the app goes through this
 * one function — general product analytics (app_open, recipe_viewed, …) and the
 * notification funnel alike (notification_opened, …) — so there's exactly one place
 * that knows how to reach Firebase Analytics, not one per feature.
 *
 * Moved out of `lib/notifications/` (where it started, notification-events-only) once
 * app-wide analytics needed the same plumbing — same file, same behavior, just no
 * longer notification-specific. Every pre-existing notification event call site was
 * updated to the new import path, nothing about their behavior changed.
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
