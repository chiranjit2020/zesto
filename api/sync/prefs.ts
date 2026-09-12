import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors.js';
import { getDb } from '../_lib/mongo.js';
import {
  isNumberOrNull,
  isValidDeviceId,
  isValidDiet,
  isValidEffortOrNull,
  isValidEquipmentList,
  isValidLikedTags,
} from '../_lib/validate.js';

interface PrefsSnapshotDoc {
  _id: string;
  diet: string;
  equipmentOwned: string[];
  defaultBudgetInr: number | null;
  defaultTimeMinutes: number | null;
  defaultMaxEffort: string | null;
  servings: number;
  likedTags: string[];
  updatedAt: Date;
}

/**
 * POST { deviceId, diet, equipmentOwned, defaultBudgetInr, defaultTimeMinutes,
 * defaultMaxEffort, servings, likedTags } — replaces this device's `usePrefs` snapshot
 * wholesale. Same opt-in posture as api/sync/pantry.ts and api/sync/meal-history.ts
 * (docs/NOTIFICATIONS_PLAN.md §9 Q3): the client only ever calls this while
 * notifications are enabled (src/lib/notifications/dataSync.ts).
 *
 * Closes the gap tracked since Phase 6: `api/notifications/dispatch.ts` had no server-
 * side access to diet/equipment/budget/time defaults at all and hardcoded `diet: 'any'`
 * — meaning a vegetarian user could, in principle, get an egg-dish notification. `theme`
 * is deliberately not synced — it's a display setting with no bearing on the
 * recommendation engine, so there's no reason for it to leave the browser.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const body = (req.body ?? {}) as {
    deviceId?: unknown;
    diet?: unknown;
    equipmentOwned?: unknown;
    defaultBudgetInr?: unknown;
    defaultTimeMinutes?: unknown;
    defaultMaxEffort?: unknown;
    servings?: unknown;
    likedTags?: unknown;
  };
  const { deviceId, diet, equipmentOwned, defaultBudgetInr, defaultTimeMinutes, defaultMaxEffort, servings, likedTags } =
    body;

  if (!isValidDeviceId(deviceId)) {
    res.status(400).json({ ok: false, error: 'invalid-device-id' });
    return;
  }
  if (!isValidDiet(diet)) {
    res.status(400).json({ ok: false, error: 'invalid-diet' });
    return;
  }
  if (!isValidEquipmentList(equipmentOwned)) {
    res.status(400).json({ ok: false, error: 'invalid-equipment' });
    return;
  }
  if (!isNumberOrNull(defaultBudgetInr)) {
    res.status(400).json({ ok: false, error: 'invalid-default-budget' });
    return;
  }
  if (!isNumberOrNull(defaultTimeMinutes)) {
    res.status(400).json({ ok: false, error: 'invalid-default-time' });
    return;
  }
  if (!isValidEffortOrNull(defaultMaxEffort)) {
    res.status(400).json({ ok: false, error: 'invalid-default-effort' });
    return;
  }
  if (typeof servings !== 'number' || servings < 1 || servings > 20) {
    res.status(400).json({ ok: false, error: 'invalid-servings' });
    return;
  }
  if (!isValidLikedTags(likedTags)) {
    res.status(400).json({ ok: false, error: 'invalid-liked-tags' });
    return;
  }

  try {
    const db = await getDb();
    await db.collection<PrefsSnapshotDoc>('prefsSnapshots').updateOne(
      { _id: deviceId },
      {
        $set: {
          diet,
          equipmentOwned,
          defaultBudgetInr,
          defaultTimeMinutes,
          defaultMaxEffort,
          servings,
          likedTags,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Zesto API] sync/prefs failed:', err);
    res.status(500).json({ ok: false, error: 'server-error' });
  }
}
