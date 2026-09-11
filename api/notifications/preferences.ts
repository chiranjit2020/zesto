import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { getDb } from '../_lib/mongo';
import { isBoolean, isValidDeviceId, isValidHHMM, isValidTimezone } from '../_lib/validate';
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from '../../src/domain/types';

interface PreferencesDoc extends NotificationPreferences {
  _id: string;
  updatedAt: Date;
}

/**
 * GET  ?deviceId=... — returns stored preferences, or the defaults if this device has
 *      never registered any (never a 404 — the client always has *something* to show).
 * POST { deviceId, ...NotificationPreferences } — replaces the stored document.
 * The Profile ("You") preferences UI (spec §26, Phase 4) is the only intended caller.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    const deviceId = req.query.deviceId;
    if (!isValidDeviceId(deviceId)) {
      res.status(400).json({ ok: false, error: 'invalid-device-id' });
      return;
    }
    try {
      const db = await getDb();
      const doc = await db.collection<PreferencesDoc>('notificationPreferences').findOne({ _id: deviceId });
      if (!doc) {
        res.status(200).json({ ok: true, preferences: DEFAULT_NOTIFICATION_PREFERENCES });
        return;
      }
      const { _id, updatedAt, ...prefs } = doc;
      void _id;
      void updatedAt;
      res.status(200).json({ ok: true, preferences: prefs });
    } catch (err) {
      console.error('[Zesto API] preferences GET failed:', err);
      res.status(500).json({ ok: false, error: 'server-error' });
    }
    return;
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as { deviceId?: unknown } & Partial<NotificationPreferences>;
    const { deviceId, ...rest } = body;

    if (!isValidDeviceId(deviceId)) {
      res.status(400).json({ ok: false, error: 'invalid-device-id' });
      return;
    }
    const err = validatePreferencesPatch(rest);
    if (err) {
      res.status(400).json({ ok: false, error: err });
      return;
    }

    try {
      const db = await getDb();
      await db.collection<PreferencesDoc>('notificationPreferences').updateOne(
        { _id: deviceId },
        { $set: { ...rest, updatedAt: new Date() } },
        { upsert: true },
      );
      res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[Zesto API] preferences POST failed:', e);
      res.status(500).json({ ok: false, error: 'server-error' });
    }
    return;
  }

  res.status(405).json({ ok: false, error: 'method-not-allowed' });
}

function validatePreferencesPatch(p: Partial<NotificationPreferences>): string | null {
  if (p.enabled !== undefined && !isBoolean(p.enabled)) return 'invalid-enabled';
  if (p.meals) {
    for (const k of ['breakfast', 'brunch', 'lunch', 'dinner', 'supper'] as const) {
      if (p.meals[k] !== undefined && !isBoolean(p.meals[k])) return `invalid-meals-${k}`;
    }
  }
  if (p.smart) {
    for (const k of ['pantry', 'leftovers', 'budget', 'weeklySummary'] as const) {
      if (p.smart[k] !== undefined && !isBoolean(p.smart[k])) return `invalid-smart-${k}`;
    }
  }
  if (p.maxPerDay !== undefined && (typeof p.maxPerDay !== 'number' || p.maxPerDay < 1 || p.maxPerDay > 10)) {
    return 'invalid-max-per-day';
  }
  if (p.quietHours) {
    if (p.quietHours.enabled !== undefined && !isBoolean(p.quietHours.enabled)) return 'invalid-quiet-hours-enabled';
    if (p.quietHours.start !== undefined && !isValidHHMM(p.quietHours.start)) return 'invalid-quiet-hours-start';
    if (p.quietHours.end !== undefined && !isValidHHMM(p.quietHours.end)) return 'invalid-quiet-hours-end';
  }
  if (p.timezone !== undefined && !isValidTimezone(p.timezone)) return 'invalid-timezone';
  return null;
}
