import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

/**
 * Firebase client wiring (§6/§7 of docs/NOTIFICATIONS_PLAN.md). Guarded end to end so
 * an unconfigured or unsupported browser degrades to "notifications unavailable"
 * rather than breaking anything else — spec §29: "Firebase unavailable → Zesto still
 * works normally."
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';

export const isFirebaseConfigured = Object.values(config).every((v) => !!v);

let app: FirebaseApp | null = null;
function getApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (!app) app = initializeApp(config);
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
