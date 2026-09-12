import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Db } from 'mongodb';
import { applyCors } from '../_lib/cors.js';
import { requireAdminToken } from '../_lib/auth.js';
import { getDb } from '../_lib/mongo.js';
import { sendPush, isUnregisteredTokenError } from '../_lib/fcm.js';
import { newNotificationId, recordNotification } from '../_lib/history.js';
import { localParts, minutesSinceMidnight, inWindow, approxLocalMidnightUtc } from '../_lib/time.js';
import { rankRecipes } from '../../src/domain/recommend.js';
import { pantryContextIds, expiringSoon } from '../../src/domain/pantry.js';
import { recentlyCookedNumbers } from '../../src/domain/kitchenHistory.js';
import { RECIPES } from '../../src/data/catalog.js';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type DecisionContext,
  type MealHistoryEntry,
  type NotificationPreferences,
  type PantryItem,
  type Recipe,
  type ScoredRecipe,
} from '../../src/domain/types.js';

/**
 * The scheduled dispatcher (spec §9/§12, Phase 6) — called by
 * `.github/workflows/notifications-dispatch.yml`'s cron, never by the client (spec §23).
 * One run evaluates every enabled device once: is *right now* a moment worth notifying
 * this device, and if so, about what? Mirrors spec §9's flow diagram almost step for
 * step — prefs → quiet hours → daily limit → candidates → recommendation engine →
 * send/skip — logging a structured decision (spec §30) for every device either way.
 *
 * Known gap, deliberately not closed here: `usePrefs` (diet, equipment, budget/time
 * defaults) isn't synced server-side, only pantry + meal history (docs/
 * NOTIFICATIONS_PLAN.md §9 Q3 only ever scoped those two). `DecisionContext.diet` below
 * is hardcoded to `'any'` rather than the user's real preference — meaning a vegetarian
 * user could, in principle, get an egg-dish notification. Real gap, tracked here rather
 * than silently glossed over; closing it means extending the sync this same way pantry/
 * history were.
 */

const MAX_DEVICES_PER_RUN = 200;
const RECENT_HISTORY_LIMIT = 30;
const DUPLICATE_RECIPE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // spec §14 "duplicate recipe prevention"
const CATEGORY_COOLDOWN_MS = 3 * 60 * 60 * 1000; // spec §14 "cooldown period"

type MealKey = keyof NotificationPreferences['meals'];
type Category = 'pantry-expiry' | 'pantry-match' | 'leftover-rescue' | 'budget' | 'meal';

/** Default meal windows (spec §12 — "defaults, not rigid global rules"), local time-of-day
 *  minutes. `midnight` isn't in NotificationPreferences.meals (that shape shipped in
 *  Phase 4 without it), so it borrows the `supper` toggle as its gate — quiet hours
 *  (default 23:00–07:00) already suppresses it for anyone who hasn't deliberately
 *  narrowed that window, which is the common case. */
const MEAL_WINDOWS: { mealKey: MealKey; type: string; start: number; end: number }[] = [
  { mealKey: 'breakfast', type: 'breakfast', start: 7 * 60, end: 10 * 60 },
  { mealKey: 'brunch', type: 'brunch', start: 10 * 60, end: 12 * 60 },
  { mealKey: 'lunch', type: 'lunch', start: 12 * 60, end: 15 * 60 },
  { mealKey: 'dinner', type: 'dinner', start: 18 * 60, end: 21 * 60 },
  { mealKey: 'supper', type: 'supper', start: 21 * 60, end: 23 * 60 },
  { mealKey: 'supper', type: 'midnight', start: 23 * 60, end: 2 * 60 },
];

const TITLES: Record<string, string> = {
  breakfast: '☀️ Good morning',
  brunch: '🍳 Brunch idea',
  lunch: '🍚 Lunch idea',
  dinner: '🌙 Dinner sorted',
  supper: '🌙 Supper idea',
  midnight: '🌙 Midnight Zesto',
  'pantry-match': "🧺 You've got a meal hiding in your pantry",
  'pantry-expiry': '🧺 Use it before it turns',
  'leftover-rescue': "♻️ Don't waste that",
  budget: '💰 Still got a little budget left?',
};

interface DeviceDoc {
  _id: string;
  fcmToken: string;
  enabled: boolean;
  timezone: string | null;
}
interface PreferencesDoc extends NotificationPreferences {
  _id: string;
  updatedAt: Date;
}
interface PantrySnapshotDoc {
  _id: string;
  items: PantryItem[];
  updatedAt: Date;
}
interface HistorySnapshotDoc {
  _id: string;
  entries: MealHistoryEntry[];
  updatedAt: Date;
}
interface HistoryRow {
  deviceId: string;
  type: string;
  recipeNumber?: number | null;
  sentAt: Date;
  status: string;
}

interface EvalOutcome {
  decision: 'sent' | 'skipped';
  reason: string;
  type?: string;
  mealType?: string;
  recipeNumber?: number;
  score?: number;
  priority?: number;
}

/**
 * Priority table (spec §15). Ranking among *candidates* still comes from the
 * recommendation engine's own continuous score (rankRecipes' `minScore` is the
 * "notification relevance threshold" of spec §14) — this table only decides which
 * classified candidate wins when more than one clears that bar, and labels the pick for
 * logging, matching spec's own vocabulary (PANTRY EXPIRY OPPORTUNITY, etc.).
 */
function classify(
  scored: ScoredRecipe,
  expiringIds: Set<string>,
): { category: Category; priority: number; reason: string } {
  const fullMatch = scored.missingIngredients.length === 0;
  const usesExpiring = scored.recipe.keyIngredients.some((id) => expiringIds.has(id));
  if (fullMatch && usesExpiring) {
    return { category: 'pantry-expiry', priority: 95, reason: 'Uses ingredients expiring soon, and you have everything else' };
  }
  if (fullMatch) return { category: 'pantry-match', priority: 90, reason: 'You already have everything for this' };
  if (usesExpiring) return { category: 'leftover-rescue', priority: 85, reason: 'Uses ingredients expiring soon' };
  if (scored.recipe.costInr <= 30) return { category: 'budget', priority: 80, reason: `Only ₹${scored.recipe.costInr}` };
  return { category: 'meal', priority: 60, reason: scored.reasons[0] ?? 'A solid match right now' };
}

function isCategoryEnabled(category: Category, prefs: NotificationPreferences, mealKey: MealKey): boolean {
  switch (category) {
    case 'pantry-expiry':
    case 'pantry-match':
      return prefs.smart.pantry;
    case 'leftover-rescue':
      return prefs.smart.leftovers;
    case 'budget':
      return prefs.smart.budget;
    case 'meal':
      return prefs.meals[mealKey];
  }
}

function templateFor(category: Category, windowType: string, recipe: Recipe) {
  const title = TITLES[category === 'meal' ? windowType : category] ?? '🍽️ Zesto';
  const body = `${recipe.title} — ₹${recipe.costInr} · ${recipe.timeMinutes} min`;
  return { title, body };
}

/** Deep-merges stored preferences over the defaults — a doc missing a field it predates
 *  (or no doc at all, for a device that registered but was never GET/POST-ed to
 *  preferences.ts) must not read as `undefined` and skip every check that follows. */
function resolvePreferences(doc: PreferencesDoc | null): NotificationPreferences {
  if (!doc) return DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...doc,
    meals: { ...DEFAULT_NOTIFICATION_PREFERENCES.meals, ...doc.meals },
    smart: { ...DEFAULT_NOTIFICATION_PREFERENCES.smart, ...doc.smart },
    quietHours: { ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours, ...doc.quietHours },
  };
}

async function evaluateDevice(db: Db, device: DeviceDoc, now: Date): Promise<EvalOutcome> {
  const prefsDoc = await db.collection<PreferencesDoc>('notificationPreferences').findOne({ _id: device._id });
  const prefs = resolvePreferences(prefsDoc);
  if (!prefs.enabled) return { decision: 'skipped', reason: 'master-off' };

  const timezone = prefs.timezone || device.timezone || 'Asia/Kolkata';
  const parts = localParts(timezone, now);
  const minutes = minutesSinceMidnight(parts);

  if (prefs.quietHours.enabled) {
    const [qsH, qsM] = prefs.quietHours.start.split(':').map(Number);
    const [qeH, qeM] = prefs.quietHours.end.split(':').map(Number);
    if (inWindow(minutes, qsH * 60 + qsM, qeH * 60 + qeM)) return { decision: 'skipped', reason: 'quiet-hours' };
  }

  const window = MEAL_WINDOWS.find((w) => inWindow(minutes, w.start, w.end));
  if (!window) return { decision: 'skipped', reason: 'no-window' };

  const recentHistory = await db
    .collection<HistoryRow>('notificationHistory')
    .find({ deviceId: device._id, status: 'sent' })
    .sort({ sentAt: -1 })
    .limit(RECENT_HISTORY_LIMIT)
    .toArray();

  const midnightUtc = approxLocalMidnightUtc(minutes, now);
  const sentToday = recentHistory.filter((h) => h.sentAt >= midnightUtc).length;
  if (sentToday >= prefs.maxPerDay) return { decision: 'skipped', reason: 'daily-limit-reached' };

  const duplicateCutoff = new Date(now.getTime() - DUPLICATE_RECIPE_WINDOW_MS);
  const recentRecipeNumbers = new Set(
    recentHistory.filter((h) => h.sentAt >= duplicateCutoff && h.recipeNumber != null).map((h) => h.recipeNumber),
  );
  const lastSentAtByCategory = new Map<string, Date>();
  for (const h of recentHistory) if (!lastSentAtByCategory.has(h.type)) lastSentAtByCategory.set(h.type, h.sentAt);

  const [pantrySnap, historySnap] = await Promise.all([
    db.collection<PantrySnapshotDoc>('pantrySnapshots').findOne({ _id: device._id }),
    db.collection<HistorySnapshotDoc>('mealHistorySnapshots').findOne({ _id: device._id }),
  ]);
  const pantryItems = pantrySnap?.items ?? [];
  const history = historySnap?.entries ?? [];
  const expiringIds = new Set(expiringSoon(pantryItems, 3).map((i) => i.ingredientId));

  const ctx: DecisionContext = {
    pantry: pantryContextIds(pantryItems),
    budgetInr: null,
    timeMinutes: null,
    calorieBand: null,
    maxEffort: null,
    equipmentAvailable: null,
    diet: 'any', // see the file-level comment — not synced yet, a real gap
    servings: 1,
    leftoverIngredients: [...expiringIds],
    recentlyCookedNumbers: recentlyCookedNumbers(history),
    likedTags: [],
  };

  const ranked = rankRecipes(RECIPES, ctx, { limit: 8, minScore: 0.35 });
  if (ranked.length === 0) return { decision: 'skipped', reason: 'no-candidates' };

  const classified = ranked
    .map((candidate) => ({ candidate, ...classify(candidate, expiringIds) }))
    .sort((a, b) => b.priority - a.priority || b.candidate.score - a.candidate.score);

  let chosen: (typeof classified)[number] | null = null;
  for (const c of classified) {
    if (!isCategoryEnabled(c.category, prefs, window.mealKey)) continue;
    if (recentRecipeNumbers.has(c.candidate.recipe.number)) continue;
    const lastOfCategory = lastSentAtByCategory.get(c.category);
    if (lastOfCategory && now.getTime() - lastOfCategory.getTime() < CATEGORY_COOLDOWN_MS) continue;
    chosen = c;
    break;
  }
  if (!chosen) return { decision: 'skipped', reason: 'no-eligible-candidate' };

  const { title, body } = templateFor(chosen.category, window.type, chosen.candidate.recipe);
  const url = `/r/${chosen.candidate.recipe.slug}`;
  const recipeNumber = chosen.candidate.recipe.number;

  const notifId = newNotificationId();
  try {
    // notifId travels in the payload so a click can be traced back to this exact row
    // (spec §17/§20 — see src/sw.ts's notificationclick handler).
    await sendPush(device.fcmToken, {
      title,
      body,
      data: {
        type: chosen.category,
        mealType: window.type,
        url,
        recipeNumber: String(recipeNumber),
        notifId: notifId.toString(),
      },
    });
    await recordNotification(notifId, {
      userId: device._id,
      deviceId: device._id,
      type: chosen.category,
      mealType: window.type,
      recipeNumber,
      url,
      title,
      body,
      reason: chosen.reason,
      score: chosen.candidate.score,
      status: 'sent',
    });
    return {
      decision: 'sent',
      type: chosen.category,
      mealType: window.type,
      recipeNumber,
      score: chosen.candidate.score,
      priority: chosen.priority,
      reason: chosen.reason,
    };
  } catch (err) {
    // spec §29's device-lifecycle rule — same as api/notifications/test.ts.
    if (isUnregisteredTokenError(err)) {
      await db.collection<DeviceDoc>('notificationDevices').updateOne({ _id: device._id }, { $set: { enabled: false } });
    }
    await recordNotification(notifId, {
      userId: device._id,
      deviceId: device._id,
      type: chosen.category,
      mealType: window.type,
      recipeNumber,
      url,
      title,
      body,
      reason: chosen.reason,
      score: chosen.candidate.score,
      status: 'failed',
      error: String(err),
    });
    console.error('[Zesto API] dispatch send failed:', err);
    return { decision: 'skipped', reason: 'send-failed' };
  }
}

/**
 * POST, cron-only (spec §23 — never client-callable). Evaluates every enabled device
 * once and logs a structured decision for each (spec §30), whether sent or skipped —
 * skipped is not an error, it's the system correctly deciding silence beats noise
 * (spec §14).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }
  if (!requireAdminToken(req, res, 'NOTIFICATIONS_CRON_SECRET')) return;

  try {
    const db = await getDb();
    const now = new Date();
    const devices = await db
      .collection<DeviceDoc>('notificationDevices')
      .find({ enabled: true })
      .limit(MAX_DEVICES_PER_RUN)
      .toArray();

    let sent = 0;
    let skipped = 0;
    for (const device of devices) {
      const outcome = await evaluateDevice(db, device, now);
      if (outcome.decision === 'sent') sent += 1;
      else skipped += 1;
      console.log(JSON.stringify({ deviceId: device._id, timestamp: now.toISOString(), ...outcome }));
    }

    res.status(200).json({ ok: true, evaluated: devices.length, sent, skipped });
  } catch (err) {
    console.error('[Zesto API] dispatch failed:', err);
    res.status(500).json({ ok: false, error: 'server-error' });
  }
}
