import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors.js';
import { getDb } from '../_lib/mongo.js';
import { isValidDeviceId } from '../_lib/validate.js';

// The client itself caps history at 400 entries (src/state/kitchen.ts's `logCook`) —
// 500 leaves headroom without accepting an unbounded payload.
const MAX_ENTRIES = 500;

interface MealHistoryEntryInput {
  id?: unknown;
  recipeNumber?: unknown;
  cookedAt?: unknown;
  servings?: unknown;
  actualCostInr?: unknown;
  rating?: unknown;
  wasLeftoverRescue?: unknown;
  deliveryAvoided?: unknown;
}

interface SnapshotDoc {
  _id: string;
  entries: MealHistoryEntryInput[];
  updatedAt: Date;
}

/** See api/sync/pantry.ts's isValidItems comment — same posture, own-data round-trip. */
function isValidEntries(v: unknown): v is MealHistoryEntryInput[] {
  if (!Array.isArray(v) || v.length > MAX_ENTRIES) return false;
  return v.every((e) => {
    if (e === null || typeof e !== 'object') return false;
    const entry = e as MealHistoryEntryInput;
    return typeof entry.recipeNumber === 'number' && typeof entry.cookedAt === 'string';
  });
}

/**
 * POST { deviceId, entries } — replaces this device's meal-history snapshot wholesale.
 * See api/sync/pantry.ts for the opt-in rationale (docs/NOTIFICATIONS_PLAN.md §9 Q3) —
 * this is that same sync, for `src/state/kitchen.ts`'s history instead of pantry. Feeds
 * Phase 6's dispatcher: recent-meal / repetition-penalty scoring needs this, and
 * `computeWeekStats`-style aggregates are what Phase 8's weekly summary will read from.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const body = (req.body ?? {}) as { deviceId?: unknown; entries?: unknown };
  const { deviceId, entries } = body;
  if (!isValidDeviceId(deviceId)) {
    res.status(400).json({ ok: false, error: 'invalid-device-id' });
    return;
  }
  if (!isValidEntries(entries)) {
    res.status(400).json({ ok: false, error: 'invalid-entries' });
    return;
  }

  try {
    const db = await getDb();
    await db
      .collection<SnapshotDoc>('mealHistorySnapshots')
      .updateOne({ _id: deviceId }, { $set: { entries, updatedAt: new Date() } }, { upsert: true });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Zesto API] sync/meal-history failed:', err);
    res.status(500).json({ ok: false, error: 'server-error' });
  }
}
