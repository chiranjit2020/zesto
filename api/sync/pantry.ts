import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors.js';
import { getDb } from '../_lib/mongo.js';
import { isValidDeviceId } from '../_lib/validate.js';

const MAX_ITEMS = 500;

interface PantryItemInput {
  id?: unknown;
  ingredientId?: unknown;
  quantity?: unknown;
  unit?: unknown;
  expiry?: unknown;
  estValueInr?: unknown;
  addedAt?: unknown;
}

interface SnapshotDoc {
  _id: string;
  items: PantryItemInput[];
  updatedAt: Date;
}

/** Loose shape check, not a full schema validator — this is the user's own device-local
 *  data round-tripping to their own row, not attacker-controlled input granting any
 *  privilege; the point is to reject garbage/oversized payloads, not to police every field. */
function isValidItems(v: unknown): v is PantryItemInput[] {
  if (!Array.isArray(v) || v.length > MAX_ITEMS) return false;
  return v.every(
    (it) => it !== null && typeof it === 'object' && typeof (it as PantryItemInput).ingredientId === 'string',
  );
}

/**
 * POST { deviceId, items } — replaces this device's pantry snapshot wholesale (the
 * client always sends its full current pantry — src/lib/notifications/dataSync.ts —
 * there's no incremental diffing at this scale). Opt-in only: the client never calls
 * this unless notifications are enabled (docs/NOTIFICATIONS_PLAN.md §9 Q3), which is
 * also what Profile.tsx's "Data" section copy tells the user. Feeds Phase 6's dispatcher
 * — it's the only reason this data leaves the browser at all (spec §9's recommendation
 * engine needs pantry contents it otherwise has no access to server-side).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const body = (req.body ?? {}) as { deviceId?: unknown; items?: unknown };
  const { deviceId, items } = body;
  if (!isValidDeviceId(deviceId)) {
    res.status(400).json({ ok: false, error: 'invalid-device-id' });
    return;
  }
  if (!isValidItems(items)) {
    res.status(400).json({ ok: false, error: 'invalid-items' });
    return;
  }

  try {
    const db = await getDb();
    await db
      .collection<SnapshotDoc>('pantrySnapshots')
      .updateOne({ _id: deviceId }, { $set: { items, updatedAt: new Date() } }, { upsert: true });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Zesto API] sync/pantry failed:', err);
    res.status(500).json({ ok: false, error: 'server-error' });
  }
}
