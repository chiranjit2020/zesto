import type { NotificationHistoryItem, NotificationPreferences } from '../../domain/types';

/**
 * Talks to the Vercel API (api/notifications/*), never Firebase Functions — see
 * docs/NOTIFICATIONS_PLAN.md §0's 2026-09-12 decision. `VITE_API_BASE_URL` unset means
 * that deployment hasn't happened yet; every call here degrades to a silent no-op
 * rather than throwing, exactly like an unconfigured Firebase project (spec §29).
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

export const isApiConfigured = BASE_URL.length > 0;

/**
 * Registers this device's FCM token with the backend (fire-and-forget from the caller's
 * point of view — a failure here must never surface as "notifications didn't work" to
 * the user, since the token is already valid and stored locally regardless).
 */
export async function registerDevice(deviceId: string, fcmToken: string): Promise<boolean> {
  if (!isApiConfigured) return false;
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch(`${BASE_URL}/api/notifications/register-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, fcmToken, timezone }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPreferences(deviceId: string): Promise<NotificationPreferences | null> {
  if (!isApiConfigured) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/notifications/preferences?deviceId=${encodeURIComponent(deviceId)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { ok: boolean; preferences?: NotificationPreferences };
    return body.preferences ?? null;
  } catch {
    return null;
  }
}

export async function savePreferences(deviceId: string, patch: Partial<NotificationPreferences>): Promise<boolean> {
  if (!isApiConfigured) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/notifications/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, ...patch }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Manual test send (spec §28, Phase 5) against the admin-gated api/notifications/test.ts.
 * `adminToken` is never read from an env var here — a VITE_-prefixed var would ship it to
 * every visitor's browser bundle, exactly what spec §23 ("never send privileged
 * notification requests directly from the browser") warns against. Its only caller,
 * NotificationsSettings.tsx, asks for it interactively via `window.prompt` each time and
 * never persists it, and renders the button itself only behind `import.meta.env.DEV` —
 * so the whole call site is dead code, stripped from every production build.
 */
/**
 * Marks one `notificationHistory` row opened (spec §17/§20) — called once the app has
 * loaded with the `?notif=` param `src/sw.ts`'s `notificationclick` handler adds. Same
 * fire-and-forget posture as the rest of this file: a failed mark is lost telemetry,
 * never a broken app.
 */
export async function markNotificationOpened(deviceId: string, notifId: string): Promise<boolean> {
  if (!isApiConfigured) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/notifications/opened`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, notifId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * The in-app notification center's data (spec §27, Phase 9) — this device's recent
 * notifications, newest first. Same silent-degrade posture as everything else here:
 * an unconfigured/unreachable API just means an empty list, never a visible error.
 */
export async function fetchNotificationHistory(deviceId: string, limit = 30): Promise<NotificationHistoryItem[]> {
  if (!isApiConfigured) return [];
  try {
    const res = await fetch(
      `${BASE_URL}/api/notifications/history?deviceId=${encodeURIComponent(deviceId)}&limit=${limit}`,
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { ok: boolean; items?: NotificationHistoryItem[] };
    return body.items ?? [];
  } catch {
    return [];
  }
}

async function updateHistoryRow(deviceId: string, notifId: string, action: 'read' | 'dismiss'): Promise<boolean> {
  if (!isApiConfigured) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/notifications/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, notifId, action }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Spec §27's "mark as read" — independent of `markNotificationOpened` above, which
 *  tracks an actual click-through, not just having seen the item in the list. */
export function markNotificationRead(deviceId: string, notifId: string): Promise<boolean> {
  return updateHistoryRow(deviceId, notifId, 'read');
}

/** Spec §27's "optionally dismiss" — removes the row from future `fetchNotificationHistory`
 *  results (api/notifications/history.ts's GET filters on `dismissedAt: null`); the row
 *  itself is kept, not deleted, since it still counts toward dispatch.ts's fatigue/
 *  duplicate-recipe/cooldown checks. */
export function dismissNotification(deviceId: string, notifId: string): Promise<boolean> {
  return updateHistoryRow(deviceId, notifId, 'dismiss');
}

export async function sendTestNotification(
  deviceId: string,
  adminToken: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isApiConfigured) return { ok: false, error: 'api-not-configured' };
  try {
    const res = await fetch(`${BASE_URL}/api/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ deviceId }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    return { ok: res.ok && data.ok === true, error: data.error };
  } catch {
    return { ok: false, error: 'network-error' };
  }
}
