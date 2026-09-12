import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import { applyCors } from '../_lib/cors.js';
import { getDb } from '../_lib/mongo.js';
import { isValidDeviceId } from '../_lib/validate.js';
import type { NotificationHistoryItem } from '../../src/domain/types.js';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

interface HistoryDoc {
  _id: ObjectId;
  deviceId: string;
  type: string;
  mealType?: string | null;
  recipeNumber?: number | null;
  // Optional here even though api/_lib/history.ts's `NotificationHistoryRecord` now
  // always sets it — a row written before Phase 9 predates the field entirely.
  url?: string | null;
  title: string;
  body: string;
  reason: string;
  status: 'sent' | 'failed';
  sentAt: Date;
  openedAt: Date | null;
  readAt: Date | null;
  dismissedAt: Date | null;
}

/**
 * GET  ?deviceId=...&limit=... — the in-app notification center (spec §27, Phase 9):
 *      this device's recent *sent* notifications, newest first, dismissed ones excluded.
 *      `status: 'failed'` rows are also excluded — nothing actually reached the device,
 *      so there's nothing to show "as received" (see the type's own doc comment).
 * POST { deviceId, notifId, action: 'read' | 'dismiss' } — spec §27's "mark as read" /
 *      "optionally dismiss". ("open recommendation" doesn't need its own action here —
 *      it's a plain deep link through `notificationClickUrl`, which already marks the
 *      row opened via the existing `POST /api/notifications/opened`, spec §17/§20.)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    const deviceId = req.query.deviceId;
    if (!isValidDeviceId(deviceId)) {
      res.status(400).json({ ok: false, error: 'invalid-device-id' });
      return;
    }
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), MAX_LIMIT) : DEFAULT_LIMIT;

    try {
      const db = await getDb();
      const rows = await db
        .collection<HistoryDoc>('notificationHistory')
        // `dismissedAt: null` also matches rows written before this field existed
        // (Mongo's null-equality includes "field absent") — see api/_lib/history.ts.
        .find({ deviceId, status: 'sent', dismissedAt: null })
        .sort({ sentAt: -1 })
        .limit(limit)
        .toArray();

      const items: NotificationHistoryItem[] = rows.map((r) => ({
        id: r._id.toString(),
        type: r.type,
        mealType: r.mealType ?? null,
        recipeNumber: r.recipeNumber ?? null,
        url: r.url ?? null,
        title: r.title,
        body: r.body,
        reason: r.reason,
        status: r.status,
        sentAt: r.sentAt.toISOString(),
        openedAt: r.openedAt ? r.openedAt.toISOString() : null,
        readAt: r.readAt ? r.readAt.toISOString() : null,
      }));
      res.status(200).json({ ok: true, items });
    } catch (err) {
      console.error('[Zesto API] notifications/history GET failed:', err);
      res.status(500).json({ ok: false, error: 'server-error' });
    }
    return;
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as { deviceId?: unknown; notifId?: unknown; action?: unknown };
    const { deviceId, notifId, action } = body;

    if (!isValidDeviceId(deviceId)) {
      res.status(400).json({ ok: false, error: 'invalid-device-id' });
      return;
    }
    if (typeof notifId !== 'string' || !ObjectId.isValid(notifId)) {
      res.status(400).json({ ok: false, error: 'invalid-notif-id' });
      return;
    }
    if (action !== 'read' && action !== 'dismiss') {
      res.status(400).json({ ok: false, error: 'invalid-action' });
      return;
    }

    try {
      const db = await getDb();
      const field = action === 'read' ? 'readAt' : 'dismissedAt';
      // `deviceId` in the filter is the same lightweight ownership check as
      // api/notifications/opened.ts — a device can only touch its own rows.
      await db
        .collection<HistoryDoc>('notificationHistory')
        .updateOne({ _id: new ObjectId(notifId), deviceId }, { $set: { [field]: new Date() } });
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[Zesto API] notifications/history POST failed:', err);
      res.status(500).json({ ok: false, error: 'server-error' });
    }
    return;
  }

  res.status(405).json({ ok: false, error: 'method-not-allowed' });
}
