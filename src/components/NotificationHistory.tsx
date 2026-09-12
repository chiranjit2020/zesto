import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from './ui/primitives';
import { Icon } from './ui/Icon';
import { useNotifications } from '../state/notifications';
import { relativeDay } from '../lib/format';
import { notificationClickUrl } from '../lib/notifications/payload';
import { dismissNotification, fetchNotificationHistory, isApiConfigured, markNotificationRead } from '../lib/notifications/api';
import type { NotificationHistoryItem } from '../domain/types';

/**
 * Spec §27's "notification center" (Phase 9) — a lightweight in-app history reading
 * back `notificationHistory`, already written by Phases 5/6's send paths. Lives in
 * Profile ("You"), right under `NotificationsSettings`, same section-per-concern layout
 * as "Recently cooked"/"Favorites" elsewhere on that page.
 *
 * `title`/`body` are rendered exactly as stored — the row is what the device actually
 * received (`api/notifications/dispatch.ts`'s `templateFor`), not re-derived here, so
 * the two can never drift apart (same reasoning as `NotificationHistoryItem`'s own doc
 * comment in src/domain/types.ts).
 *
 * Deliberately renders nothing (not even an empty state) when there's nothing to show —
 * matches this feature's established "silence beats noise" posture (spec §14,
 * `weeklySummaryTemplate`'s `null` return) rather than greeting the vast majority of
 * visitors who've never enabled notifications with an empty card.
 */
export function NotificationHistory() {
  const deviceId = useNotifications((s) => s.deviceId);
  const [items, setItems] = useState<NotificationHistoryItem[] | null>(null);

  useEffect(() => {
    if (!isApiConfigured) return;
    let cancelled = false;
    fetchNotificationHistory(deviceId).then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  if (!items || items.length === 0) return null;

  // "Open recommendation" (spec §27) is a plain deep link through the same
  // `notificationClickUrl` helper src/sw.ts and foreground.ts use — App.tsx's
  // `useNotificationOpenTracking` already fires on any route change carrying `?notif=`,
  // in-app or not, so this gets open-tracking + analytics for free rather than
  // duplicating that call here.
  const markRead = (id: string) => {
    setItems((cur) => cur && cur.map((i) => (i.id === id ? { ...i, readAt: i.readAt ?? new Date().toISOString() } : i)));
    void markNotificationRead(deviceId, id);
  };

  const dismiss = (id: string) => {
    setItems((cur) => cur && cur.filter((i) => i.id !== id));
    void dismissNotification(deviceId, id);
  };

  return (
    <section>
      <SectionHeader title="Notification history" />
      <div className="z-card divide-y divide-line">
        {items.map((item) => {
          const unread = !item.readAt;
          const text = (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {unread && <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" aria-hidden />}
                <span className={`text-sm truncate ${unread ? 'font-bold' : 'font-semibold text-content-muted'}`}>
                  {item.title}
                </span>
              </div>
              <div className="text-2xs text-content-faint mt-0.5 truncate">
                {item.body} · {relativeDay(item.sentAt)}
              </div>
            </div>
          );
          return (
            <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
              {item.url ? (
                <Link
                  to={notificationClickUrl({ notifId: item.id }, item.url)}
                  className="flex-1 min-w-0 hover:text-brand"
                  onClick={() => markRead(item.id)}
                >
                  {text}
                </Link>
              ) : (
                // Only a pre-Phase-9 row (no stored `url`) lands here — still lets
                // spec §27's "mark as read" happen on tap.
                <button className="flex-1 min-w-0 text-left" onClick={() => markRead(item.id)}>
                  {text}
                </button>
              )}
              <button
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="z-tap shrink-0 text-content-faint hover:text-content"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
