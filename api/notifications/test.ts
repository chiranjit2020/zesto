import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors.js';
import { requireAdminToken } from '../_lib/auth.js';
import { getDb } from '../_lib/mongo.js';
import { isValidDeviceId } from '../_lib/validate.js';
import { sendPush, isUnregisteredTokenError } from '../_lib/fcm.js';
import { newNotificationId, recordNotification } from '../_lib/history.js';

interface DeviceDoc {
  _id: string;
  fcmToken: string;
  enabled: boolean;
}

const TITLE = '🧪 Zesto test notification';
const BODY = "If you can see this, the real pipeline worked — Mongo lookup, Admin SDK send, deep link.";
const URL = '/you';

/**
 * POST { deviceId } — admin-gated (spec §28) manual test send, the "Manual test-
 * notification path" of docs/NOTIFICATIONS_PLAN.md's Phase 5. Deliberately exercises the
 * same pipeline Phase 6's scheduled dispatcher will use — MongoDB device lookup, Firebase
 * Admin SDK send, notificationHistory logging — rather than just confirming FCM itself
 * works, which the Firebase console's own test-send already does against the token
 * logged on enable (src/components/NotificationsSettings.tsx).
 *
 * Called from src/lib/notifications/api.ts's `sendTestNotification`, itself only ever
 * wired to a `import.meta.env.DEV`-gated button — see that file's comment for why this
 * endpoint existing doesn't conflict with spec §23's "never send privileged notification
 * requests directly from the browser".
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }
  if (!requireAdminToken(req, res, 'NOTIFICATIONS_TEST_ADMIN_TOKEN')) return;

  const body = (req.body ?? {}) as { deviceId?: unknown };
  const { deviceId } = body;
  if (!isValidDeviceId(deviceId)) {
    res.status(400).json({ ok: false, error: 'invalid-device-id' });
    return;
  }

  try {
    const db = await getDb();
    const device = await db.collection<DeviceDoc>('notificationDevices').findOne({ _id: deviceId });
    if (!device || !device.enabled) {
      res.status(404).json({ ok: false, error: 'device-not-found' });
      return;
    }

    const notifId = newNotificationId();
    try {
      // notifId travels in the payload so a click can be traced back to this exact row
      // (spec §17/§20 — see src/sw.ts's notificationclick handler).
      const messageId = await sendPush(device.fcmToken, {
        title: TITLE,
        body: BODY,
        data: { type: 'test', url: URL, notifId: notifId.toString() },
      });
      await recordNotification(notifId, {
        userId: deviceId,
        deviceId,
        type: 'test',
        url: URL,
        title: TITLE,
        body: BODY,
        reason: 'manual-test',
        status: 'sent',
      });
      res.status(200).json({ ok: true, messageId });
    } catch (sendErr) {
      // Spec §29's device-lifecycle rule: a token that will never work again shouldn't
      // keep failing every future send silently — mark the device inactive right here.
      if (isUnregisteredTokenError(sendErr)) {
        await db.collection<DeviceDoc>('notificationDevices').updateOne({ _id: deviceId }, { $set: { enabled: false } });
      }
      await recordNotification(notifId, {
        userId: deviceId,
        deviceId,
        type: 'test',
        url: URL,
        title: TITLE,
        body: BODY,
        reason: 'manual-test',
        status: 'failed',
        error: String(sendErr),
      });
      console.error('[Zesto API] test send failed:', sendErr);
      res.status(502).json({ ok: false, error: 'send-failed' });
    }
  } catch (err) {
    console.error('[Zesto API] notifications/test failed:', err);
    res.status(500).json({ ok: false, error: 'server-error' });
  }
}
