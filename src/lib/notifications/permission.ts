import { deleteToken, getToken } from 'firebase/messaging';
import { getMessagingIfSupported, isFirebaseConfigured, VAPID_KEY } from '../firebase';

export type NotificationSupportState =
  | 'unsupported' // no Notification/Push API, insecure context, or Firebase not configured
  | 'default' // never asked
  | 'granted'
  | 'denied';

/**
 * Reads current support/permission state without prompting anything (spec §5 — never
 * call `Notification.requestPermission()` just to find out where things stand).
 */
export async function getNotificationSupportState(): Promise<NotificationSupportState> {
  if (!isFirebaseConfigured) return 'unsupported';
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported';
  if (!(await getMessagingIfSupported())) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export interface EnableResult {
  ok: boolean;
  token?: string;
  /** why it didn't work, for logging/UI — never thrown, always returned */
  reason?: 'unsupported' | 'permission-denied' | 'permission-dismissed' | 'token-failed';
}

/**
 * The one place that ever calls `Notification.requestPermission()` — only invoked from
 * an explicit tap on "Enable smart notifications" (spec §5), never on mount/load.
 * Every failure mode is caught and returned, not thrown — a broken push registration
 * must never take the rest of the app down with it (spec §29).
 */
export async function enableNotifications(): Promise<EnableResult> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return { ok: false, reason: 'unsupported' };

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'denied') return { ok: false, reason: 'permission-denied' };
    if (permission !== 'granted') return { ok: false, reason: 'permission-dismissed' };

    // Bind to the app's own service worker registration (src/sw.ts) rather than letting
    // Firebase register a second one at /firebase-messaging-sw.js — see
    // docs/NOTIFICATIONS_PLAN.md §6 on why only one worker may control this scope.
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return { ok: false, reason: 'token-failed' };
    return { ok: true, token };
  } catch {
    return { ok: false, reason: 'token-failed' };
  }
}

/**
 * Turning notifications off in-app. Browser permission itself can't be revoked from
 * JS (by design), only the FCM token — so "off" here means "stop sending," which is
 * exactly what deleting the token achieves. Best-effort: if this fails offline or
 * mid-flight, the local store still flips to disabled (spec §29 — never let this block
 * the rest of the app).
 */
export async function disableNotifications(): Promise<void> {
  try {
    const messaging = await getMessagingIfSupported();
    if (messaging) await deleteToken(messaging);
  } catch {
    /* local state still updates regardless — see caller */
  }
}
