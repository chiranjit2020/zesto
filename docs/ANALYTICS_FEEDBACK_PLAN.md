# Product analytics + feedback system — architecture summary & gap analysis

> Required by `MASTER PROMPT — Zesto Product Analytics + User Feedback System.md`
> before any code is written. This is that deliverable (its own §25 "Phase 1 — Inspect"
> + "Phase 2 — Gap analysis"): what exists today, what's missing, and open questions
> before Phase 3 (implementation) starts. Same house style as `docs/NOTIFICATIONS_PLAN.md`.

---

## 1. Phase 1 — what actually exists today

| Master prompt's inspection point | Finding |
|---|---|
| Frontend entry / routing | `src/main.tsx` → `App.tsx`, React Router, 16 routes (`src/App.tsx:136-151`). Most routes lazy-loaded. |
| Firebase initialization | **Exists**, but scoped under `src/lib/notifications/firebase.ts` — `initializeApp`, `getMessagingIfSupported()`, `getAnalyticsIfSupported()`. Guarded end to end (spec §29: unconfigured/unsupported → `null`, never throws). |
| Firebase Analytics code | **Exists**, but small and narrowly used: `src/lib/notifications/analytics.ts` exports one function, `track(name, params)` → `logEvent`. Every existing call site is notification-specific (see §2 below). |
| Service worker | `src/sw.ts`, `injectManifest` mode (one worker, precache + push — see `docs/NOTIFICATIONS_PLAN.md` §6). Not to be duplicated; nothing here needs to touch it. |
| Profile / "You" page | `src/routes/Profile.tsx`. Sections in order: streak/metrics, Challenges, Recently cooked, Favorites, `NotificationsSettings`, `NotificationHistory`, Preferences, Data (danger zone), About link. No feedback/help section exists yet. |
| Recipe components | `src/components/RecipeCard.tsx` (`MatchCard` — the recommendation result card, links to `/r/:slug`), `src/routes/RecipeDetail.tsx` (full recipe view), `src/routes/CookMode.tsx` (step-through cooking + `CookComplete` finish screen). |
| Recommendation flow | `src/domain/recommend.ts`'s `rankRecipes()`, called from `src/components/ResultsView.tsx` — shared by `WhatCanIMake`, `Broke`, `Tired`, `Midnight`, `Leftovers`, `Improviser`, and `Discover`. One shared component, one natural instrumentation point for both `recommendation_generated` and (via `MatchCard`'s link) `recommendation_clicked`. |
| Pantry functionality | `src/state/pantry.ts` (`usePantry`) — `add`/`remove` actions. `src/routes/Pantry.tsx` is the management UI. |
| Planner functionality | `src/routes/Planner.tsx` — local state (`budget`, `people`, `effort`), a "Generate my week" button (`build()`) producing a plan via `generateWeekPlan`. No persistence beyond local state today (unlike pantry/kitchen). |
| Notification functionality | Fully built — see `docs/NOTIFICATIONS_PLAN.md`, Phases 1–10, deployed and verified in production as of 2026-09-13. |
| Existing env vars | `.env.example` — 6 required `VITE_FIREBASE_*` (Messaging), 1 optional `VITE_FIREBASE_MEASUREMENT_ID` (Analytics — **already exists**, nothing new needed to enable Analytics itself), `VITE_API_BASE_URL`. Server-side: `MONGODB_URI`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `NOTIFICATIONS_TEST_ADMIN_TOKEN`, `NOTIFICATIONS_CRON_SECRET` (Vercel-only). |
| Version/build config | **Does not exist.** `package.json` has `"version": "0.1.0"`, static, never referenced anywhere in the app or bumped in any commit this project's history shows. |
| Privacy/consent mechanism | **Does not exist.** No cookie banner, no consent gate of any kind. Existing privacy posture is Profile's own copy: "explore without an account," "Everything is stored on this device only" (amended once notifications are enabled — `docs/NOTIFICATIONS_PLAN.md` §3). |
| Error boundary / error handling | **Does not exist.** No `ErrorBoundary`, no `componentDidCatch`, no global error handler found anywhere in `src/`. |
| Existing feedback mechanism | **Does not exist.** No feedback UI, no WhatsApp integration, nothing found under any name. |

---

## 2. The one architectural finding that matters most

**Firebase Analytics currently only ever initializes for users who interact with the
notifications feature.** Every existing call site that imports
`lib/notifications/analytics.ts`'s `track()` is itself gated behind
`useNotifications().enabled` or lives inside the lazy-loaded Profile chunk's
notification settings:

- `App.tsx`'s `useNotificationOpenTracking` — fires on `?notif=` deep links only (which
  only exist if notifications were already enabled).
- `NotificationsSettings.tsx`'s `track()` calls — permission requested/granted/denied,
  enabled/disabled.

Nobody calls `getAnalyticsIfSupported()` on a plain app open. That means, **today,
Firebase Analytics never measures the majority of visitors** — exactly the opposite of
what the master prompt's §7 "Active user tracking" needs (DAU/WAU/MAU requires the SDK
to see every session, not just notification-opted-in ones).

This is good news, not a rebuild: the `track()`/`getAnalyticsIfSupported()` plumbing
already has every property the spec asks for (fire-and-forget, dynamic-imported so it
never blocks initial paint or bloats the initial bundle, fails silently offline/
unsupported, spec §29's "unconfigured = safe no-op" posture throughout). It just needs
**two changes**, not a new system:

1. Call `track('app_open')` (and similar core events) from `App.tsx`'s mount,
   unconditionally — not gated by `enabled`.
2. Move `analytics.ts` out from under `lib/notifications/` to a general `lib/analytics.ts`,
   since it's about to be used app-wide, not just for notifications. Every existing
   notification call site keeps working, just importing from the new path — no
   duplicate analytics system, per the master prompt's own explicit instruction.

---

## 3. Gap analysis

### Already implemented (reuse, do not rebuild)
- Firebase Analytics SDK wiring, guarded init, `VITE_FIREBASE_MEASUREMENT_ID` env var.
- A working `track(name, params)` helper with exactly the right non-blocking/offline-safe
  properties.
- Four notification-related events already live: `notification_permission_requested`,
  `_granted`, `_denied`, `notification_enabled`, `_disabled`, `notification_opened`,
  `notification_recipe_viewed`.
- The recommendation engine, recipe/cook-mode flow, pantry, and planner all have clear,
  single, shared choke points to instrument from (§1 above) — no scattered duplicate
  logic to untangle first.

### Missing (net-new work)
- Core engagement events: `app_open`, `session_started`, `page_viewed`.
- Discovery/kitchen/meal/planner events (§5 of the master prompt) — none exist yet.
- The feedback system entirely: UI, WhatsApp deep-link, analytics events.
- Recipe feedback (👍/👎 + reason).
- Version/build identifier.
- Error boundary + `app_error` tracking (master prompt says "if the application already
  has an error boundary... integrate carefully" — it doesn't, so this is a small net-new
  addition, kept minimal, not a full error-monitoring platform).
- A privacy-copy amendment disclosing anonymous analytics (see open question 3 below).

### Needs modification
- `src/lib/notifications/analytics.ts` → relocate/generalize to `src/lib/analytics.ts`
  (§2 above). Every existing import updated, behavior unchanged.
- `App.tsx` → add an unconditional analytics-init + `app_open`/`session_started` effect,
  and a route-change listener for `page_viewed` (both dynamically imported, matching the
  existing pattern exactly).
- `Profile.tsx` → new "Help & Feedback" section.
- `RecipeDetail.tsx` / `CookMode.tsx`'s `CookComplete` → recipe feedback prompt (exact
  placement is an open question below).

---

## 4. Proposed event list (only where real functionality already exists)

Per the master prompt's own instruction ("do not implement an event merely because it's
listed... only add events that correspond to real user actions/features"), cross-checked
against §1's inspection:

| Event | Fires from | Params |
|---|---|---|
| `app_open` | `App.tsx` mount, once per load | — |
| `session_started` | Same effect, Analytics' own session logic mostly handles this — fired for completeness/explicitness | — |
| `page_viewed` | Route-change listener in `App.tsx` | `page` |
| `recommendation_generated` | `ResultsView.tsx`, after `rankRecipes()` | `mode` (which route: broke/tired/midnight/…), `number_of_results` |
| `recommendation_clicked` | `MatchCard`'s link click | `recipe_number`, `rank` |
| `recipe_viewed` | `RecipeDetail.tsx` mount | `recipe_number` |
| `recipe_started` | `CookMode.tsx`, `cook.begin()` | `recipe_number` |
| `recipe_completed` | `CookMode.tsx`, reaching `CookComplete` | `recipe_number` |
| `meal_logged` | `CookComplete`'s "Log it to my week" → `logCook()` | `recipe_number`, `was_leftover_rescue` |
| `pantry_updated` | `usePantry.add`/`remove` | `action` (`add`/`remove`), `ingredient_count` |
| `planner_created` | `Planner.tsx`'s `build()` | `number_of_meals`, `budget` |
| `feedback_opened` | New Help & Feedback section mount | — |
| `feedback_category_selected` | Category tap | `feedback_type` |
| `feedback_submitted` | WhatsApp button click (§12: means "clicked," not "confirmed sent") | `feedback_type`, `source` |
| `recipe_feedback_submitted` | New 👍/👎 prompt | `recipe_number`, `rating`, `reason` |
| `app_error` | New minimal error boundary | `error_type`, `page` |

**Not implementing** (spec listed them, but no corresponding feature exists, or the
signal isn't reliably available client-side — same "say so rather than fake it" posture
as `docs/NOTIFICATIONS_PLAN.md` throughout):
- `pantry_viewed` — covered by generic `page_viewed` on `/pantry`; a separate event adds
  nothing `page_viewed` doesn't already say.
- `planner_viewed`, `meal_plan_updated` — same reasoning; `Planner.tsx` has no separate
  "update an existing plan" action distinct from `planner_created` today.
- `ingredient_added`/`ingredient_removed` as separate events — folded into
  `pantry_updated`'s `action` param instead, per the master prompt's own §6 example for
  that exact event.
- `notification_received`/`notification_dismissed` — already known-unbuildable from a
  service worker context, documented in `lib/notifications/analytics.ts`'s own comment;
  unchanged by this work.

---

## 5. Open questions (need your call before Phase 3 starts)

1. **Analytics-always-on.** Confirmed above as necessary for real DAU/WAU/MAU. This
   means the Analytics SDK (gtag.js, still dynamically imported/deferred, never blocking
   first paint) now loads for every visitor, not just notification opt-ins. Proceeding
   on this unless you'd rather keep it opt-in-only (which would mean DAU numbers only
   ever reflect the subset who enabled notifications — not recommended, but flagging the
   trade-off explicitly).
2. **WhatsApp number.** Needed to build the `wa.me` deep link — what number (with
   country code) should feedback go to?
3. **Consent/privacy scope.** No consent system exists today, and the app already has no
   accounts/login. My default plan: no cookie-banner-style gate — just an honest line
   added to Profile's existing privacy copy ("Zesto also collects anonymous usage
   analytics to improve the app"), consistent with the app's existing lightweight
   posture. Flag if you're targeting a jurisdiction (e.g., EU/GDPR) that needs more than
   that.
4. **Version scheme.** No existing convention. Two options: (a) start actually bumping
   `package.json`'s `version` field on real changes, or (b) embed the build's git short
   SHA at build time (`import.meta.env` via a Vite `define`) — zero-maintenance, exact,
   but not human-friendly. Recommend (b) for correlating feedback with an exact deploy,
   optionally shown alongside a human `0.1.0`-style version too.
5. **Recipe feedback storage.** Should 👍/👎 + reason also write to a new lightweight
   MongoDB collection (so recipe quality can actually be queried/aggregated later — e.g.,
   "which recipes get the most 👎 and why"), or is a Firebase Analytics event alone
   enough for now? Recommend also storing in Mongo — matches this app's own precedent
   (`notificationHistory`) of keeping a queryable record of structured outcomes rather
   than only firing analytics events. This would need one small new endpoint
   (`api/feedback/recipe.ts`), same shape as `api/sync/*`.
6. **Recipe feedback placement.** Recommend showing "Was this recipe useful?" on
   `CookComplete` (after finishing cooking — a real signal, and matches §22's "do not
   interrupt the cooking experience," since it's not shown mid-steps) rather than on
   `RecipeDetail` (merely viewed, not cooked). Flag if you want it in both places, or
   somewhere else.

---

## 6. Phase 3/4 — what was actually built (2026-09-13)

All five open questions from §5 were resolved before implementation: Analytics
always-on (confirmed), git-SHA version scheme (confirmed), recipe feedback also stored
in MongoDB (confirmed), lightweight privacy copy only (confirmed), WhatsApp number
provided directly.

- **`src/lib/firebase.ts`** (moved from `lib/notifications/firebase.ts`) and
  **`src/lib/analytics.ts`** (moved from `lib/notifications/analytics.ts`) — same files,
  generalized doc comments, every existing notification call site updated to the new
  path. No behavior change to the notification funnel.
- **New `src/lib/track.ts`** — a tiny, dependency-free, statically-importable facade
  that internally dynamic-imports `lib/analytics.ts` on first call. Every feature now
  does `import { track } from '.../lib/track'` and calls it directly, instead of each
  repeating the `void import('...').then(...)` dance — one centralized place. Verified
  in the production build that the actual Firebase Analytics SDK (`firebase-*.js`,
  ~107 KB) remains a separate lazy chunk from the main bundle, not pulled into the
  initial load.
- **`App.tsx`**: new `useCoreAnalytics()` — fires `app_open` + `session_started` once on
  mount, `page_viewed` on every route change. Unconditional, not gated by notification
  opt-in (§2's key finding) — this is what makes DAU/WAU/MAU measurable at all.
- **New `src/components/ErrorBoundary.tsx`**, wrapping the app in `main.tsx` (outside
  `BrowserRouter`, so a crash below the router can't take the boundary down with it).
  Logs one `app_error` per crash (`error_type`, truncated `message`, `page`,
  `__ZESTO_VERSION__`) — never a full stack trace or app state.
- **`vite.config.ts`**: `__ZESTO_VERSION__` — the build's git short SHA, embedded as a
  literal `define` constant. Works under `actions/checkout`'s default shallow clone
  (the checked-out commit's own hash is always available even at depth 1). Falls back
  to `'dev'` if git isn't available at all.
- **Analytics events wired** (see §4's table for the full list): `recommendation_generated`
  (`ResultsView.tsx`), `recommendation_clicked` (`RecipeCard.tsx`'s `MatchCard`),
  `recipe_viewed` (`RecipeDetail.tsx`), `recipe_started`/`recipe_completed`
  (`CookMode.tsx`), `meal_logged` (`CookComplete`'s "Log it to my week"), `pantry_updated`
  (`Pantry.tsx`'s two add/remove call sites — the ingredient-picker sheet and the direct
  remove button; incidental pantry adds from `WhatCanIMake.tsx`/`RecipeDetail.tsx`'s
  "+pantry" buttons deliberately left uninstrumented, since those are recommendation/
  recipe features that happen to touch pantry as a side effect, not the pantry-management
  feature itself), `planner_created` (`Planner.tsx`).
- **`meal_completed`** (spec's Meal-section event): deliberately treated as the same
  signal as `recipe_completed` rather than a duplicate — this codebase has no distinct
  "mark a planned meal done" flow separate from just cooking the recipe through the
  normal `CookMode` path, so a second event at the same trigger point would say nothing
  `recipe_completed` doesn't already say.
- **New `src/lib/feedback/whatsapp.ts`** — builds the `wa.me` deep link with a
  pre-filled, user-editable message (feedback type, current page, a coarse OS/browser
  guess — not a full user-agent string — and `__ZESTO_VERSION__`). Never sends
  automatically; the user reviews and sends it themselves in WhatsApp.
- **New `src/components/HelpFeedback.tsx`**, mounted in `Profile.tsx` between
  Preferences and Data. Three rows (Report a problem / Suggest an idea / General
  feedback), Lucide icons in place of the spec's literal emoji mock (matching this
  app's existing "no raw emoji" convention). Renders nothing if `VITE_WHATSAPP_NUMBER`
  isn't configured. `feedback_opened` fires on mount, `feedback_category_selected` +
  `feedback_submitted` fire on tap — the footnote copy is explicit that nothing sends
  until the user does so themselves in WhatsApp.
- **New `src/components/RecipeFeedback.tsx`** ("Was this recipe useful?"), mounted on
  `CookMode.tsx`'s completion screen, visible regardless of whether the user logs the
  meal or skips. 👍 submits immediately with no reason; 👎 offers reasons with a "skip"
  escape hatch — never forces a choice.
- **New `api/feedback/recipe.ts`** + `recipeFeedback` Mongo collection — insert-only
  (a device re-cooking and re-rating the same recipe is two real data points, not a
  correction), no admin gate (same low-privilege own-data posture as `api/sync/*`).
  Reasons are a fixed, short set of keys (matching the master prompt's own suggested
  list) rather than free text, so this is actually aggregatable later.
- **Privacy copy**: Profile's "Data" section now mentions anonymous usage analytics
  alongside the existing pantry/history/preferences sync disclosure — no separate
  consent gate, consistent with the app's existing no-account posture.
- **New env var**: `VITE_WHATSAPP_NUMBER` — public, non-secret (same footing as the
  Firebase web config), added to `.env.example` and `deploy.yml`'s build step. Needs
  adding as a GitHub repo secret before the live site picks it up (same pattern as every
  other `VITE_*` var).

**Verified:** `npx tsc --noEmit` clean, `npm run typecheck:api` clean, `vitest run`
26/26 passing (including the route smoke test, which now renders `HelpFeedback` and
exercises `RecipeFeedback`'s WhatsApp-URL construction), `npm run build` clean —
`dist/sw.js` builds unchanged, `firebase-*.js`/`analytics-*.js` remain separate lazy
chunks from the main bundle. `sw.ts` was not touched and doesn't import anything from
the moved/new files, so the notification funnel and offline/PWA behavior are
unaffected — confirmed by inspecting its own import list, not just by tests passing.

**Not built** (deliberately, matching §17's "do not overbuild an admin dashboard now"):
any dashboard UI reading Firebase Analytics or `recipeFeedback` back — both are
independently queryable later (Firebase Console for the former, a Mongo query for the
latter) without needing anything further from this phase.

## 7. Remaining work

- **Deploy-side:** `VITE_WHATSAPP_NUMBER` needs adding as a GitHub repo secret (and,
  once this reaches a real Vercel-backed environment check, nothing server-side needs
  it — the endpoint it feeds, `api/feedback/recipe.ts`, doesn't touch WhatsApp at all).
  Until it's added, the live site simply won't show the Help & Feedback section at all
  (same safe-no-op posture as every other unconfigured piece here) — not broken, just
  inactive.
- **Verification against the real deployment** hasn't happened yet — everything above
  is typecheck/test/build-verified locally, same starting point every notification
  phase was in before its own real-deploy pass (`docs/NOTIFICATIONS_PLAN.md`). See the
  final report for exactly what to check once this ships.
- **Not built, matching §17's "do not overbuild" instruction:** any dashboard reading
  the new data back. Both Firebase Analytics (via its own Console) and `recipeFeedback`
  (via a direct Mongo query) are already independently inspectable without it.

Each phase ships independently reviewable/testable, matching this project's own
established convention (`docs/NOTIFICATIONS_PLAN.md`'s closing line) and the master
prompt's own §25 five-phase process (Inspect → Gap analysis → Implement analytics →
Implement feedback → Test).
