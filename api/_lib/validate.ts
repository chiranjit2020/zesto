/**
 * Minimal, dependency-free input validation (spec §23 — "validate all
 * notification-related API input"). No auth/accounts exist in this app (§9 Q4 of
 * docs/NOTIFICATIONS_PLAN.md), so a device only ever writes its own row, keyed by a
 * client-generated id — these checks exist to reject garbage, not to authorize.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidDeviceId(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

/** FCM registration tokens are opaque, but always long — a cheap sanity bound. */
export function isValidFcmToken(v: unknown): v is string {
  return typeof v === 'string' && v.length > 20 && v.length < 4096;
}

export function isValidTimezone(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > 64) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: v });
    return true;
  } catch {
    return false;
  }
}

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export function isValidHHMM(v: unknown): v is string {
  return typeof v === 'string' && HHMM_RE.test(v);
}

export function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}
