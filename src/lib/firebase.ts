import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';
import { getAnalytics, isSupported as analyticsIsSupported, type Analytics } from 'firebase/analytics';

/**
 * Firebase client wiring (§6/§7 of docs/NOTIFICATIONS_PLAN.md) — Messaging and Analytics
 * share one Firebase app instance, so this lives at `lib/` root rather than under
 * `lib/notifications/` (where it started): Analytics is now used app-wide (see
 * `lib/analytics.ts`, docs/ANALYTICS_FEEDBACK_PLAN.md), not just for the notification
 * funnel. Guarded end to end so an unconfigured or unsupported browser degrades to
 * "notifications/analytics unavailable" rather than breaking anything else — spec §29:
 * "Firebase unavailable → Zesto still works normally."
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';
// Analytics (spec §19) needs its own measurement ID, separate from Messaging's config —
// missing it just means analytics stays off, same "unconfigured = safe no-op" posture
// as everything else here (spec §29).
const MEASUREMENT_ID = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? '';

export const isFirebaseConfigured = Object.values(config).every((v) => !!v);

let app: FirebaseApp | null = null;
function getApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  // measurementId is spread in only when set, kept out of `config`/isFirebaseConfigured
  // above so an unconfigured Analytics stream never blocks Messaging from working.
  if (!app) app = initializeApp(MEASUREMENT_ID ? { ...config, measurementId: MEASUREMENT_ID } : config);
  return app;
}

let messagingPromise: Promise<Messaging | null> | null = null;

/**
 * Resolves the Messaging instance, or `null` if Firebase isn't configured, the
 * browser doesn't support the Push/Notification APIs (older Safari, some in-app
 * browsers), or the page isn't in a secure context. Cached — safe to call repeatedly.
 */
export function getMessagingIfSupported(): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const firebaseApp = getApp();
      if (!firebaseApp) return null;
      try {
        if (!(await isSupported())) return null;
        return getMessaging(firebaseApp);
      } catch {
        return null;
      }
    })();
  }
  return messagingPromise;
}

let analyticsPromise: Promise<Analytics | null> | null = null;

/**
 * Resolves the Analytics instance, or `null` if Firebase/measurement isn't configured,
 * the browser doesn't support it (e.g. no cookies/IndexedDB — private browsing modes
 * vary), or init throws for any other reason. Cached — safe to call repeatedly. Only
 * usable from a normal window/tab context (uses gtag.js + IndexedDB); never called from
 * src/sw.ts — see src/lib/notifications/analytics.ts.
 */
export function getAnalyticsIfSupported(): Promise<Analytics | null> {
  if (!analyticsPromise) {
    analyticsPromise = (async () => {
      const firebaseApp = getApp();
      if (!firebaseApp || !MEASUREMENT_ID) return null;
      try {
        if (!(await analyticsIsSupported())) return null;
        return getAnalytics(firebaseApp);
      } catch {
        return null;
      }
    })();
  }
  return analyticsPromise;
}
