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

// Mirrors src/domain/types.ts's Diet/EquipmentId/EffortLevel literal unions. Inlined
// rather than imported — this file stays dependency-free by design (see the file-level
// comment) — so a new value added to those types needs adding here too.
const DIETS = new Set(['vegetarian', 'egg', 'any']);
const EQUIPMENT_IDS = new Set(['no-cook', 'kettle', 'microwave', 'one-pan', 'one-pot', 'tawa', 'rice-cooker']);
const EFFORT_LEVELS = new Set(['very-low', 'low', 'medium', 'high']);

export function isValidDiet(v: unknown): v is string {
  return typeof v === 'string' && DIETS.has(v);
}

/** api/sync/prefs.ts's own-data round-trip — see api/sync/pantry.ts's isValidItems
 *  comment for why this is a loose shape check, not a full schema validator. */
export function isValidEquipmentList(v: unknown): v is string[] {
  return Array.isArray(v) && v.length <= 20 && v.every((x) => typeof x === 'string' && EQUIPMENT_IDS.has(x));
}

export function isValidEffortOrNull(v: unknown): v is string | null {
  return v === null || (typeof v === 'string' && EFFORT_LEVELS.has(v));
}

export function isNumberOrNull(v: unknown): v is number | null {
  return v === null || typeof v === 'number';
}

export function isValidLikedTags(v: unknown): v is string[] {
  return Array.isArray(v) && v.length <= 50 && v.every((x) => typeof x === 'string' && x.length <= 60);
}
