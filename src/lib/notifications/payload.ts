/**
 * Shared between src/sw.ts (background) and src/lib/notifications/foreground.ts
 * (foreground) — both build a `Notification` from the same FCM `data` payload and need
 * the same click-target URL, so this one pure function is the only place that logic
 * lives (spec §18: "keep behavior consistent" between the two paths).
 */
export interface PushData {
  title?: string;
  body?: string;
  type?: string;
  url?: string;
  notifId?: string;
}

/**
 * Appends `notifId` (if present) to the deep-link URL as a `notif` query param, so the
 * app can trace a click back to its `notificationHistory` row once it loads (spec §17's
 * deep link feeding §20's funnel) — see `useNotificationOpenTracking` in App.tsx, the
 * consumer of this param.
 */
export function notificationClickUrl(data: PushData, fallback: string): string {
  const base = data.url || fallback;
  if (!data.notifId) return base;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}notif=${encodeURIComponent(data.notifId)}`;
}
