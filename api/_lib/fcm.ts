import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Cached Admin SDK app across warm serverless invocations — same `globalThis` pattern as
 * api/_lib/mongo.ts, for the same reason (re-`initializeApp`-ing on every request is
 * wasteful, and Vercel's dev server module reloads would otherwise throw "app already
 * exists"). `FIREBASE_SERVICE_ACCOUNT_JSON` is the full Admin SDK service-account JSON,
 * set only as a Vercel environment variable — never a VITE_-prefixed var, never in the
 * client bundle (spec §23).
 */
declare global {
  // eslint-disable-next-line no-var
  var _zestoFirebaseAdminApp: App | undefined;
}

function getFirebaseApp(): App {
  if (globalThis._zestoFirebaseAdminApp) return globalThis._zestoFirebaseAdminApp;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not set');
  // getApps() survives a dev-server module reload even though the module-level variable
  // above doesn't always; prefer the already-initialized app if one is already there.
  globalThis._zestoFirebaseAdminApp = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(json)) });
  return globalThis._zestoFirebaseAdminApp;
}

export interface PushPayload {
  title: string;
  body: string;
  /** merged into the FCM `data` map; every value must be a string (FCM's own constraint) */
  data?: Record<string, string>;
}

/**
 * Sends one push. Deliberately `data`-only, no top-level `notification` field — matching
 * src/sw.ts's `onBackgroundMessage` and src/lib/notifications/foreground.ts's `onMessage`,
 * which both expect that (a `notification` field makes the browser auto-display a
 * generic system notification and skips our handler entirely, losing the deep-link
 * target and per-category icon — see src/sw.ts's own comment on this). Returns the FCM
 * message id; throws on failure, left to the caller (spec §29's device-lifecycle rule
 * needs to see the specific error, not just a boolean).
 */
export async function sendPush(fcmToken: string, payload: PushPayload): Promise<string> {
  const messaging = getMessaging(getFirebaseApp());
  return messaging.send({
    token: fcmToken,
    data: { title: payload.title, body: payload.body, ...payload.data },
  });
}

/**
 * True for FCM's "this token will never work again" errors (uninstalled, permission
 * revoked and expired, or malformed) — spec §29: "Invalid device/installation → mark
 * inactive/remove according to safe lifecycle rules," not just log-and-ignore.
 */
export function isUnregisteredTokenError(err: unknown): boolean {
  const code = (err as { errorInfo?: { code?: string } } | null | undefined)?.errorInfo?.code;
  return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
}
