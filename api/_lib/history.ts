import { ObjectId } from 'mongodb';
import { getDb } from './mongo.js';

/**
 * One row of `notificationHistory` (spec §8/§20's funnel). `type` is left as `string`
 * rather than a fixed union here since Phase 6's dispatcher has the real meal/smart
 * categories (breakfast, pantry, budget, …) — this file only needs the shape, not the
 * vocabulary. `recipeNumber` matches this repo's own catalog key (`src/data/catalog.ts`
 * indexes recipes by `number`, not `id` — spec §8's `recipeId` doesn't exist here).
 */
export interface NotificationHistoryRecord {
  userId: string;
  deviceId: string;
  type: string;
  mealType?: string | null;
  recipeNumber?: number | null;
  title: string;
  body: string;
  reason: string;
  score?: number | null;
  status: 'sent' | 'failed';
  error?: string | null;
}

/**
 * A fresh id for a notification about to be sent — generated *before* the push goes
 * out so it can be embedded in the FCM payload's `data.notifId` (spec §17's deep link
 * needs to say *which* notification was clicked, for open-tracking), then passed to
 * `recordNotification` below once the send's outcome is known. Simpler than inserting
 * a placeholder row and updating it after send: Mongo accepts a caller-supplied `_id`
 * at insert time, so this is one insert, not an insert-then-update.
 */
export function newNotificationId(): ObjectId {
  return new ObjectId();
}

/**
 * Appends one row under the given id. Never throws — a logging failure must never mask
 * or reverse the actual send result the caller already committed to returning (spec
 * §29's general "failure must not cascade" posture).
 */
export async function recordNotification(id: ObjectId, record: NotificationHistoryRecord): Promise<void> {
  try {
    const db = await getDb();
    await db.collection('notificationHistory').insertOne({
      _id: id,
      ...record,
      sentAt: new Date(),
      openedAt: null,
      // Phase 9 (spec §27's notification center): `readAt`/`dismissedAt` distinguish
      // "glanced at in the in-app list" from `openedAt`'s "clicked through to the
      // recipe" (spec §20's funnel already owns that one). Explicit `null` here even
      // though api/notifications/history.ts's `dismissedAt: null` filter also matches
      // rows that predate this field entirely — same self-documenting-schema reasoning
      // as `openedAt` above.
      readAt: null,
      dismissedAt: null,
    });
  } catch (err) {
    console.error('[Zesto API] failed to write notificationHistory:', err);
  }
}
