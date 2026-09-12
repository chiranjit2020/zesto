/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  // Public support contact for Help & Feedback's WhatsApp deep link
  // (docs/ANALYTICS_FEEDBACK_PLAN.md) — not a secret, same footing as the Firebase web
  // config above: meant to be publicly reachable, just kept out of source like every
  // other configurable value in this app.
  readonly VITE_WHATSAPP_NUMBER?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Git short SHA of the build, injected by vite.config.ts's `define` — see there for why. */
declare const __ZESTO_VERSION__: string;

interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
}
interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

