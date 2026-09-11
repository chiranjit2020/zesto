import { onMessage, type MessagePayload, type Unsubscribe } from 'firebase/messaging';
import { getMessagingIfSupported } from './firebase';

/**
 * Foreground message handling (spec §18) — the counterpart to `onBackgroundMessage` in
 * `src/sw.ts`. FCM only invokes the service worker's background handler when the tab
 * isn't focused; a message arriving while Zesto is open in front never reaches the SW
 * at all, so without this, a foreground test message looks like nothing happened.
 *
 * Interim behavior: shows the same system notification the background path would (via
 * the existing SW registration, so `notificationclick` deep-linking in src/sw.ts works
 * identically either way). Spec §18 ultimately wants an in-app toast instead of a
 * browser notification while the app is already open — there's no toast/notification-
 * center primitive in this app yet to route through, so that's future polish, not a
 * silent downgrade: tracked in docs/NOTIFICATIONS_PLAN.md.
 */
export async function listenForForegroundMessages(): Promise<Unsubscribe | null> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  return onMessage(messaging, async (payload: MessagePayload) => {
    try {
      const data = payload.data ?? {};
      const title = data.title ?? payload.notification?.title ?? 'Zesto';
      const body = data.body ?? payload.notification?.body;
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
        badge: `${import.meta.env.BASE_URL}icons/icon-192.png`,
        tag: data.type ?? 'zesto-notification',
        data: { url: data.url ?? import.meta.env.BASE_URL },
      });
    } catch {
      /* never let a malformed/unexpected payload break the app (spec §29) */
    }
  });
}
