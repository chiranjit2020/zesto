import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';

/**
 * Shared-secret gate for the API's privileged, non-client-facing endpoints (spec §23:
 * "never send privileged notification requests directly from the browser"). Used by
 * the manual test-send (api/notifications/test.ts, NOTIFICATIONS_TEST_ADMIN_TOKEN) and,
 * from Phase 6 on, the cron dispatcher (api/notifications/dispatch.ts,
 * NOTIFICATIONS_CRON_SECRET). Neither token is ever a VITE_-prefixed var (docs/
 * NOTIFICATIONS_PLAN.md §8), so neither one ever ships to the browser.
 */
function timingSafeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch rather than returning false — compare
  // lengths first, which leaks only the length, not the content, of a wrong guess.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Reads the `x-admin-token` header and compares it against `process.env[envVar]`. Fails
 * closed: if the env var itself isn't set, every request is rejected (503) — there's no
 * "test mode is open by default" state to accidentally ship. Writes the error response
 * itself; callers just return early when this returns `false`.
 */
export function requireAdminToken(req: VercelRequest, res: VercelResponse, envVar: string): boolean {
  const expected = process.env[envVar];
  if (!expected) {
    res.status(503).json({ ok: false, error: 'not-configured' });
    return false;
  }
  const given = req.headers['x-admin-token'];
  if (typeof given !== 'string' || !timingSafeEquals(given, expected)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return false;
  }
  return true;
}
