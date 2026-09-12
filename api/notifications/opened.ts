import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import { applyCors } from '../_lib/cors.js';
import { getDb } from '../_lib/mongo.js';
import { isValidDeviceId } from '../_lib/validate.js';

/**
 * POST { deviceId, notifId } — marks one `notificationHistory` row opened (spec §17's
 * deep link, §20's funnel: notification_opened). Called from the app itself once it has
 * loaded with the `?notif=` query param `src/sw.ts`'s `notificationclick` handler adds
 * (`App.tsx`'s `useNotificationOpenTracking`) — not from the service worker directly,
 * since a click handler can't reliably reach an API before the browser finishes
 * navigating to (and possibly installing) the target page.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const body = (req.body ?? {}) as { deviceId?: unknown; notifId?: unknown };
  const { deviceId, notifId } = body;
  if (!isValidDeviceId(deviceId)) {
    res.status(400).json({ ok: false, error: 'invalid-device-id' });
    return;
  }
  if (typeof notifId !== 'string' || !ObjectId.isValid(notifId)) {
    res.status(400).json({ ok: false, error: 'invalid-notif-id' });
    return;
  }

  try {
    const db = await getDb();
    // `deviceId` in the filter is a lightweight ownership check — a device can only
    // mark its own notifications opened, not an arbitrary id belonging to someone else.
    await db
      .collection('notificationHistory')
      .updateOne({ _id: new ObjectId(notifId), deviceId }, { $set: { openedAt: new Date() } });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Zesto API] notifications/opened failed:', err);
    res.status(500).json({ ok: false, error: 'server-error' });
  }
}
