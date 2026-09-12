import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors.js';
import { getDb } from '../_lib/mongo.js';
import { isValidDeviceId } from '../_lib/validate.js';

// Short, stable keys matching the master prompt's own suggested reason list
// (docs/ANALYTICS_FEEDBACK_PLAN.md §13) — kept as a fixed set rather than free text so
// this is actually aggregatable later ("which recipes get the most X"), not a pile of
// one-off strings.
const REASONS = new Set([
  'ingredients_unavailable',
  'cost_wrong',
  'time_wrong',
  'instructions_unclear',
  'didnt_work',
  'portion_issue',
  'other',
]);

interface RecipeFeedbackDoc {
  deviceId: string;
  recipeNumber: number;
  rating: 'up' | 'down';
  reason: string | null;
  createdAt: Date;
}

/**
 * POST { deviceId, recipeNumber, rating, reason? } — appends one recipe-feedback row
 * (docs/ANALYTICS_FEEDBACK_PLAN.md §13, open question 5). Insert-only, not
 * upsert-per-device-per-recipe: a device cooking the same recipe twice and rating it
 * differently each time is two real, separate data points, not a correction of the
 * first. No admin gate — same low-privilege, anonymous, own-data-only posture as
 * `api/sync/*` (a device can only ever describe its own experience, nothing about
 * anyone else's).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const body = (req.body ?? {}) as {
    deviceId?: unknown;
    recipeNumber?: unknown;
    rating?: unknown;
    reason?: unknown;
  };
  const { deviceId, recipeNumber, rating, reason } = body;

  if (!isValidDeviceId(deviceId)) {
    res.status(400).json({ ok: false, error: 'invalid-device-id' });
    return;
  }
  if (typeof recipeNumber !== 'number' || !Number.isInteger(recipeNumber) || recipeNumber < 1) {
    res.status(400).json({ ok: false, error: 'invalid-recipe-number' });
    return;
  }
  if (rating !== 'up' && rating !== 'down') {
    res.status(400).json({ ok: false, error: 'invalid-rating' });
    return;
  }
  if (reason !== undefined && reason !== null && (typeof reason !== 'string' || !REASONS.has(reason))) {
    res.status(400).json({ ok: false, error: 'invalid-reason' });
    return;
  }

  try {
    const db = await getDb();
    const doc: RecipeFeedbackDoc = {
      deviceId,
      recipeNumber,
      rating,
      reason: (reason as string | undefined) ?? null,
      createdAt: new Date(),
    };
    await db.collection<RecipeFeedbackDoc>('recipeFeedback').insertOne(doc);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Zesto API] feedback/recipe failed:', err);
    res.status(500).json({ ok: false, error: 'server-error' });
  }
}
