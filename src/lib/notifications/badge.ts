import { fetchNotificationHistory, isApiConfigured } from './api';
import { useNotifications } from '../../state/notifications';

/**
 * Keeps the bell icon's red-dot badge (Layout.tsx) in sync with server truth. "Unread"
 * lives entirely server-side (`notificationHistory.readAt`, api/notifications/history.ts)
 * — there's no local event that fires when a background push lands (that's the whole
 * problem it's covering for: a notification can reach the tray, or fail to, entirely
 * outside this tab's JS), so the only honest source is asking the API, not inferring a
 * count from whatever this tab happened to observe.
 */
export async function refreshUnreadCount(deviceId: string): Promise<void> {
  if (!isApiConfigured) return;
  const items = await fetchNotificationHistory(deviceId);
  useNotifications.getState().setUnreadCount(items.filter((i) => !i.readAt).length);
}
