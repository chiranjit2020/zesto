import { getDb } from './mongo.js';

/**
 * One row of `notificationHistory` (spec §8/§20's funnel). `type` is left as `string`
 * rather than a fixed union here since Phase 6's dispatcher will add the real meal/smart
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
 * Appends one row. Never throws — a logging failure must never mask or reverse the
 * actual send result the caller already committed to returning (spec §29's general
 * "failure must not cascade" posture).
 */
export async function recordNotification(record: NotificationHistoryRecord): Promise<void> {
  try {
    const db = await getDb();
    await db.collection('notificationHistory').insertOne({
      ...record,
      sentAt: new Date(),
      openedAt: null,
    });
  } catch (err) {
    console.error('[Zesto API] failed to write notificationHistory:', err);
  }
}
