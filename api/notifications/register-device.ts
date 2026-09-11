import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors.js';
import { getDb } from '../_lib/mongo.js';
import { isValidDeviceId, isValidFcmToken, isValidTimezone } from '../_lib/validate.js';
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from '../../src/domain/types.js';

interface DeviceDoc {
  _id: string;
  fcmToken: string;
  platform: 'web';
  userAgent: string | null;
  timezone: string | null;
  enabled: boolean;
  createdAt: Date;
  lastSeenAt: Date;
}

interface PreferencesDoc extends NotificationPreferences {
  _id: string;
  updatedAt: Date;
}

/**
 * POST { deviceId, fcmToken, timezone? } — upserts `notificationDevices` and, on first
 * registration only, seeds `notificationPreferences` with the defaults (spec §7/§4).
 * No accounts exist in this app (§9 Q4 of docs/NOTIFICATIONS_PLAN.md) — `deviceId` is
 * the client-generated id from `src/state/notifications.ts` and doubles as the "userId"
 * everywhere else in the schema.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const body = (req.body ?? {}) as { deviceId?: unknown; fcmToken?: unknown; timezone?: unknown };
  const { deviceId, fcmToken, timezone } = body;

  if (!isValidDeviceId(deviceId)) {
    res.status(400).json({ ok: false, error: 'invalid-device-id' });
    return;
  }
  if (!isValidFcmToken(fcmToken)) {
    res.status(400).json({ ok: false, error: 'invalid-fcm-token' });
    return;
  }
  if (timezone !== undefined && !isValidTimezone(timezone)) {
    res.status(400).json({ ok: false, error: 'invalid-timezone' });
    return;
  }

  try {
    const db = await getDb();
    const now = new Date();

    await db.collection<DeviceDoc>('notificationDevices').updateOne(
      { _id: deviceId },
      {
        $set: {
          fcmToken,
          platform: 'web',
          userAgent: (req.headers['user-agent'] as string | undefined)?.slice(0, 300) ?? null,
          timezone: timezone ?? null,
          enabled: true,
          lastSeenAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    // Seed preferences only if this device has never had any — never clobber existing
    // choices on a re-registration (e.g. a token refresh).
    await db.collection<PreferencesDoc>('notificationPreferences').updateOne(
      { _id: deviceId },
      {
        $setOnInsert: {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...(timezone ? { timezone } : {}),
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Zesto API] register-device failed:', err);
    res.status(500).json({ ok: false, error: 'server-error' });
  }
}
