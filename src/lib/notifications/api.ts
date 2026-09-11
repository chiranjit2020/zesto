import type { NotificationPreferences } from '../../domain/types';

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
