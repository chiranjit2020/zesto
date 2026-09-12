# Push notifications — architecture summary & gap analysis

> Required by `notification-prompt.md` §37 before any code is written. This is that
> deliverable: what exists today, where the spec's assumptions don't match this repo,
> and a realistic phased plan. Lives on `feature/push-notifications` only — `main` is
> untouched until this is ready to merge.

## 0. Decisions made so far (dated, so this doc stays honest as it evolves)

- **2026-09-11 — Cloud accounts:** create Firebase + MongoDB Atlas from scratch (guided).
- **2026-09-11 — Privacy model:** yes, sync pantry/history to MongoDB, but only for users
  who opt into notifications (§9 Q3 below) — Profile copy will be updated to say so.
- **2026-09-11 — Hosting:** keep GitHub Pages for the frontend, not Vercel.
- **2026-09-11 — Service worker:** migrate to `injectManifest` now — **done**, merged to
  this branch, offline mode manually re-verified by the user (build + preview + DevTools
  offline toggle). See §6.
- **2026-09-12 — Backend compute (supersedes §7's original "Firebase Cloud Functions
  2nd gen + Cloud Scheduler"):** Firebase 2nd-gen Functions require the Blaze
  (pay-as-you-go) plan the moment a function calls an external service like MongoDB —
  Spark blocks all non-Google outbound network calls outright. Rather than require a
  card on file, backend compute moves to **Vercel serverless functions** (free Hobby
  tier, no billing account, unrestricted outbound calls) with **GitHub Actions
  `schedule:` cron** (already used in this repo, free) replacing Cloud Scheduler as the
  dispatcher trigger. Firebase itself is scoped down to exactly the two things that are
  free on *any* plan, including Spark: **Cloud Messaging** (client SDK + Admin SDK send)
  and **Analytics**. No Firebase Cloud Functions, no Cloud Scheduler, no Blaze upgrade.
  Sections below are updated to match; anywhere `functions/` (Firebase) is mentioned in
  older prose, read it as `api/` (Vercel).

---

## 1. Current architecture (as it actually is, not as the spec assumes)

| Spec assumes | Reality in this repo |
|---|---|
| "Existing Zesto Node.js/TypeScript architecture" (backend) | **No backend at all.** Vite + React 18 + TS SPA. Nothing server-side runs today. |
| "Existing MongoDB/data layer" | **No database.** All state is `zustand` stores persisted to `localStorage` (`src/state/{prefs,pantry,kitchen,cook}.ts`) — see `docs/ARCHITECTURE.md` §7, a deliberate decision ("no server, no database, no secrets — nothing to leak"). |
| "Existing API/backend" | None. |
| "Vercel — existing PWA hosting" | Hosted on **GitHub Pages** via `.github/workflows/deploy.yml` (`actions/deploy-pages`), base path `/zesto/`, custom domain `chiranjitkarmakar.com/zesto/`. Not Vercel. |
| "Inspect the existing Zesto authentication system" | **There is no authentication.** The app is explicitly anonymous/device-local — Profile page literally reads "explore without an account" and "Everything is stored on this device only" (`src/routes/Profile.tsx`). |
| "Existing recommendation engine" | ✅ This one's real: `src/domain/recommend.ts` — deterministic scoring, `rankRecipes(recipes, context)`, returns `reasons[]`. Directly reusable. |
| "Existing service worker/PWA infrastructure" | ✅ Real: `vite-plugin-pwa` in `generateSW` mode (`vite.config.ts`), precaches the app shell + recipe catalog + fonts/icons, `navigateFallback → /offline.html`. |
| "Existing Pantry / meal history / profile area" | ✅ Real: `src/state/pantry.ts`, `src/state/kitchen.ts` (meal history + favorites), `src/routes/Profile.tsx` ("You"). |

**The load-bearing mismatch:** three of the spec's four listed hosting/data services
(Vercel, MongoDB Atlas, an "existing Node.js/TS architecture") don't exist yet, and the
fourth (Firebase project) hasn't been created. This isn't a small gap — it's the
difference between "extend the backend" (what the spec assumes) and "**stand up a
backend for the first time**" (what actually has to happen). That's a legitimate thing
to do, but it's a bigger decision than the spec's framing suggests, so §9 below asks
before any of it gets built.

---

## 2. What can be reused as-is

- **Recommendation engine** (`src/domain/recommend.ts`) — the notification decision
  engine should call this directly, not reimplement scoring. It needs to run somewhere
  with access to a user's pantry/history — today that data lives only in the browser's
  `localStorage`, which a server-side function cannot read. This is the crux of §4 below.
- **Recipe catalog** (`src/data/*.json` via `src/data/catalog.ts`) — the Vercel API
  needs read access to the same recipe data to score candidates. Since it's a committed
  JSON module, the simplest path is shipping the same JSON as an `api/` dependency (keep
  one content source, imported in two runtimes) rather than duplicating it in MongoDB.
- **Design tokens & component primitives** (`src/styles/tokens.css`, `src/components/ui/*`)
  — the preferences UI in §5 of the spec should be built from `Segmented`, `Chip`,
  `SectionHeader`, `z-card`, matching `Profile.tsx`'s existing "Preferences" section
  exactly, not a new visual style.
- **Service worker** — `vite-plugin-pwa`'s `generateSW` mode generates `sw.js` from a
  config, it doesn't hand-author a service worker file we can merge Firebase code into
  directly. See §6.

---

## 3. Files that would need modification

- `src/routes/Profile.tsx` — add a "Notifications" section (spec §26), same pattern as
  the existing "Preferences" section. Its "Data" section copy ("Everything is stored on
  this device only") gets an honest caveat once notifications are enabled (§9 Q3).
- `src/App.tsx` / `src/sw.ts` — register the Firebase Messaging `onBackgroundMessage`
  handler in the same worker as offline precaching (already migrated, see §6), mount a
  notification-permission prompt component contextually (spec §5).
- `.env.example` — new Firebase web config keys (`VITE_`-prefixed) + `VITE_API_BASE_URL`
  pointing at the Vercel deployment.
- `package.json` — new dependency: `firebase` (Web SDK, client-side only — no Admin SDK
  or Functions SDK in the Vite app).
- `.github/workflows/deploy.yml` — unchanged; still deploys the frontend to GitHub Pages.
- **New:** `.github/workflows/notifications-dispatch.yml` — a `schedule:` cron workflow
  (this repo already has one PWA-deploy workflow; this is a second, independent one)
  that `curl`s the Vercel dispatcher endpoint with a shared secret header. This is what
  replaces Cloud Scheduler.

## 4. New files required (once §9 is answered)

```
api/                                 # Vercel serverless functions (Node runtime)
  notifications/
    register-device.ts               # POST: store a notificationDevices doc
    preferences.ts                   # GET/POST: read/write notificationPreferences
    test.ts                          # gated dev-only test send (spec §28)
    dispatch.ts                      # called by the GitHub Actions cron, not the client
  _lib/
    recommend.ts                     # thin re-export/port of src/domain/recommend.ts
    mongo.ts                         # connection helper (cached client across invocations)
    fcm.ts                           # Firebase Admin SDK send wrapper
    auth.ts                          # verifies the cron shared-secret / device ownership
vercel.json                          # function config (region, etc.) if defaults don't fit
package.json                         # api/'s own deps: mongodb, firebase-admin (kept out
                                     # of the Vite app's package.json — different runtime)
public/
  firebase-messaging-sw.js           # not used — merged into src/sw.ts instead, see §6
src/
  lib/notifications/
    firebase.ts                     # initializeApp + getMessaging (client)
    permission.ts                   # contextual prompt state machine (§5)
    api.ts                          # client → Vercel API calls (fetch, not Functions SDK)
  components/NotificationsSettings.tsx
  components/NotificationPermissionPrompt.tsx
docs/
  NOTIFICATIONS_PLAN.md              # this file
.github/workflows/
  notifications-dispatch.yml         # cron → POST api/notifications/dispatch
```

## 5. MongoDB schema (adapted from spec §4/§7/§8)

Kept close to the spec's suggestion since it's already sound; `userId` needs a decision
first — see §9 question 3 (anonymous device-scoped id vs. real auth).

```
notificationPreferences   { userId, enabled, meals{breakfast,brunch,lunch,dinner,supper},
                             smart{pantry,leftovers,budget,weeklySummary}, maxPerDay,
                             quietHours{enabled,start,end}, timezone, updatedAt }
notificationDevices       { userId, installationId, platform:'web', browser, timezone,
                             enabled, createdAt, lastSeenAt, lastNotificationAt }
notificationHistory       { userId, deviceId, type, mealType, recipeNumber, title, body,
                             reason, score, sentAt, openedAt, status }
pantrySnapshots           { _id: deviceId, items[], updatedAt }   -- ✅ Phase 6, api/sync/pantry.ts
mealHistorySnapshots      { _id: deviceId, entries[], updatedAt } -- ✅ Phase 6, api/sync/meal-history.ts
```

Indexes: `notificationDevices.userId`, `notificationHistory.{userId, sentAt}` (recent-
activity + fatigue checks), `notificationPreferences.userId` (unique).

## 6. Service-worker strategy — the critical decision (spec §6, §25)

Today: `vite-plugin-pwa` in **`generateSW`** mode auto-generates `dist/sw.js` from a
declarative config (precache list + runtime caching rules). We don't hand-edit that file.

Firebase Web Messaging needs a service worker that calls
`firebase.messaging().onBackgroundMessage(...)`, registered (by default) at
`/firebase-messaging-sw.js`.

**Two workers is the wrong answer** — only one SW controls a given scope at a time; a
second `register()` at the same scope replaces the first, silently breaking offline
caching or notifications depending on registration order.

Two real options:
- **(a) Switch `vite-plugin-pwa` to `injectManifest` mode**: we author one service
  worker file by hand (`src/sw.ts`), the plugin injects the Workbox precache manifest
  into it at build time, and we add the Firebase `onBackgroundMessage` handler in the
  same file. One worker, both jobs. More control, small migration.
- **(b) Keep `generateSW`, load Firebase via `importScripts()`** inside a
  `firebase-messaging-sw.js` that also does nothing else, registered at a **narrower
  scope** so it doesn't fight the PWA worker for the same scope. Firebase's default
  `firebase.initializeApp()` + `onBackgroundMessage` pattern supports this, but push
  and offline-cache then live in two separate workers, which is more fragile long-term.

**Recommendation: (a)**, since the spec itself says "the final architecture must have
ONE coherent service-worker strategy" (§6) and injectManifest is the supported way to
get that with vite-plugin-pwa. This is real migration work, not a footnote — plan a
dedicated phase for it with the existing offline behavior (recipe browsing, pantry,
cook mode, `/offline.html` fallback) re-verified after the switch, before touching
notifications at all.

## 7. Services required

**Firebase (Spark/free plan — no billing account, no card):**
- Cloud Messaging (Web Push, needs a VAPID key pair generated in the console)
- Analytics (web)
- *Not used:* Cloud Functions, Cloud Scheduler, Blaze plan — see §0's 2026-09-12 decision.

**Vercel (Hobby/free plan — no billing account, no card):**
- One project importing this GitHub repo, deployed alongside (but independent of) the
  GitHub Pages frontend deploy — its `*.vercel.app` URL is only ever called as an API,
  never linked to as a page.
- Serverless functions under `api/` (Node runtime), each with `MONGODB_URI` and the
  Firebase Admin service-account key set as **Vercel Environment Variables** (Project
  Settings → Environment Variables), not committed anywhere.

**MongoDB Atlas** — already set up (2026-09-11): M0 free cluster, a database user, and
network access opened for Vercel's dynamic egress IPs (`0.0.0.0/0`, since Vercel doesn't
publish a static IP range on the Hobby tier).

**GitHub Actions** — already the deploy mechanism for this repo; a second, independent
`schedule:`-triggered workflow calls the Vercel dispatcher endpoint. Free for both public
and (within generous minutes) private repos.

## 8. Environment variables (`.env.example` additions)

```
# client (VITE_ prefix → bundled, so these must be the public web config only)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
VITE_FIREBASE_MEASUREMENT_ID=        # optional — Analytics (spec §19), Phase 7. Unset = analytics off.
VITE_API_BASE_URL=                   # the Vercel project's URL, e.g. https://zesto-api.vercel.app

# api/ only (Vercel Environment Variables — never committed, never in the client bundle)
MONGODB_URI=
FIREBASE_SERVICE_ACCOUNT_JSON=       # Admin SDK credential, for sending FCM messages server-side
NOTIFICATIONS_TEST_ADMIN_TOKEN=      # gates POST /api/notifications/test (spec §28)
NOTIFICATIONS_CRON_SECRET=           # shared secret the GitHub Actions cron sends; api/notifications/dispatch rejects requests without it
```

The Firebase **client** web config (`VITE_FIREBASE_*`) is not a secret — it's the same
config shipped to every browser by design; MongoDB URI, the service-account key, and the
cron secret are the real secrets here, and they live only in Vercel's environment
variables (server-side functions) and the GitHub repo's Actions secrets (for the cron
workflow to read `NOTIFICATIONS_CRON_SECRET`) — never in a client env file, never
committed.

---

## 9. Open questions

Resolved (see §0's decision log for dates/reasoning):

1. ~~Firebase project and MongoDB Atlas cluster~~ — MongoDB Atlas M0 created
   2026-09-11. Firebase project: create next, **Spark plan is enough** now that Cloud
   Functions are out of the picture (§0) — no Blaze upgrade needed.
2. ~~Keep GitHub Pages, or move to Vercel?~~ — GitHub Pages for the frontend; Vercel is
   now also in the picture, but purely as an API host, never linked to as a page.
3. ~~Where does pantry/history data live for the decision engine to read?~~ — synced to
   MongoDB, opt-in (only once a user enables notifications). Profile's "Everything is
   stored on this device only" copy needs an honest amendment once this ships.
4. **User identity with no login:** a generated anonymous device ID (`crypto.randomUUID()`,
   stored in `localStorage`, sent to the API as `userId`) — no new login flow, consistent
   with "explore without an account." Adopting this as the default; flag here if that's
   wrong.

Nothing left that blocks starting Phase 2 other than the Firebase project existing.

## 10. Phased plan (adapted from spec §34)

Re-ordered so the service-worker migration (real risk to existing offline functionality)
happened and was verified before any push-notification code touched it:

1. ✅ **Done** — Service-worker migration to `injectManifest`, offline behavior
   re-verified by hand (recipe browsing, pantry, cook mode, install prompt).
2. ✅ **Done** — Firebase project (Spark plan, no billing) + client SDK wiring:
   - `src/lib/notifications/firebase.ts` — guarded `initializeApp`/`getMessaging`,
     `null` if unconfigured or unsupported.
   - `src/lib/notifications/permission.ts` — the only place that ever calls
     `Notification.requestPermission()`, bound to the app's own SW registration
     (never a second `/firebase-messaging-sw.js`), every failure path returned not
     thrown (spec §29).
   - `src/state/notifications.ts` — anonymous `deviceId` (§9 Q4) + local
     enabled/token state, persisted.
   - `src/components/NotificationsSettings.tsx` — the contextual prompt (spec §5
     copy) in Profile ("You"), handling unsupported/default/granted/denied and
     permission-revoked-after-the-fact.
   - `src/sw.ts` — `onBackgroundMessage` (data-only payloads, so both foreground and
     background messages render through one code path with full control over
     icon/deep-link) + `notificationclick` deep-linking (spec §17).
   - `.github/workflows/deploy.yml` — bakes `VITE_FIREBASE_*`/`VITE_API_BASE_URL`
     from repo secrets into the build; unset is fine, matches local unconfigured
     behavior.
   - Fixed along the way: `src/test/setup.ts` was missing a `localStorage` stub —
     Node 22's own experimental global one shadows jsdom's, so any persisted
     zustand store write during a test threw. General fix, not notifications-specific.
   - **Not yet wired: actually registering the device anywhere.** `enableNotifications()`
     gets a real FCM token and stores it locally; sending it to a backend is Phase 3,
     since there's no backend yet.
   - **Found via manual testing, fixed 2026-09-12:** `onBackgroundMessage` alone isn't
     enough — FCM only calls it when the tab isn't focused. A message sent to a
     foregrounded tab had nowhere to go. Added `lib/notifications/foreground.ts`
     (`onMessage`), wired from `App.tsx` behind `useNotifications().enabled` and a
     dynamic `import()` so the Firebase SDK still never touches the initial bundle for
     users who haven't opted in. **Interim, not final:** this shows the same system
     notification the background path does; spec §18 wants an in-app toast instead
     while the app is already open, but there's no toast primitive in this app to
     route through yet — real polish item, not a silent shortcut.
3. Vercel project + `api/` package + MongoDB connection + `notificationPreferences` /
   `notificationDevices` collections + device-registration endpoint.
   - ✅ **Code done** — `api/health.ts` (no-Mongo sanity check), `api/_lib/{mongo,cors,
     validate}.ts`, `api/notifications/register-device.ts` (upserts a device + seeds
     default preferences on first registration only), `api/notifications/preferences.ts`
     (GET/POST, ahead of Phase 4's UI). `NotificationPreferences` type + its defaults
     live in `src/domain/types.ts`, imported by both sides so client and API can't
     silently drift apart. `src/lib/notifications/api.ts` + a `registerDevice()` call
     wired into the enable flow — no-ops until `VITE_API_BASE_URL` exists, exactly like
     an unconfigured Firebase project.
   - **Was blocked on:** the Vercel project itself not existing yet — resolved, see
     "Unblocked 2026-09-12" below.
   - `api/tsconfig.json` + `npm run typecheck:api` — a separate typecheck pass, since
     `api/` isn't part of the Vite app's module graph and Vercel compiles it independently.
   - **Unblocked 2026-09-12** — Vercel project created, `MONGODB_URI` and
     `VITE_API_BASE_URL` set (the latter locally in `.env.local`, gitignored; still needs
     baking into the GitHub Pages build via a repo secret + `deploy.yml`, same as the
     Firebase vars, before this works in production rather than just local dev).
4. ✅ **Done** — Preferences UI in Profile ("You"), full spec §4/§26 surface (meal
   toggles, smart-suggestion toggles, max-per-day, quiet hours) inside the existing
   `NotificationsSettings` card, shown once notifications are actually on.
   - `src/state/notifications.ts` — added `preferences` (persisted locally so the panel
     has something correct to paint before any fetch resolves) + `setPreferences`/
     `updatePreferences`.
   - On enable, fetches the API's copy and reconciles over the local default —
     no-ops silently if the API isn't configured, same posture as `registerDevice`.
   - **Load-bearing detail:** `api/notifications/preferences.ts`'s POST does a Mongo
     `$set` per top-level key, which replaces a nested object wholesale rather than
     deep-merging it. Every save from the UI therefore sends the *complete* `meals` /
     `smart` / `quietHours` object it belongs to, never a single changed flag — otherwise
     toggling one meal would silently erase the other four server-side.
   - Not yet wired: the "Test notification" control (spec §26/§28) — that needs
     `api/notifications/test.ts` first, which is Phase 5.
5. ✅ **Done** — Manual test-notification path (spec §28), admin-gated.
   - `api/notifications/test.ts` — `POST { deviceId }`, gated by a `x-admin-token` header
     checked against `NOTIFICATIONS_TEST_ADMIN_TOKEN` (`api/_lib/auth.ts`, timing-safe
     compare, fails closed if the env var isn't set). Looks the device up in
     `notificationDevices`, sends via `api/_lib/fcm.ts` (Firebase Admin SDK, cached app
     across warm invocations like `mongo.ts`), logs to `notificationHistory`
     (`api/_lib/history.ts`) either way. An unregistered/invalid-token error from FCM
     marks the device `enabled: false` (spec §29's device-lifecycle rule), not just a
     logged failure.
   - Deliberately exercises the real pipeline (Mongo lookup → Admin SDK → history log),
     not just "does FCM work" — the Firebase console's own test-send already answers
     that against the token this app already logs on enable.
   - **Client side, deliberately not a production affordance:** `sendTestNotification`
     (`src/lib/notifications/api.ts`) takes the admin token as a parameter rather than
     reading it from any env var — a `VITE_`-prefixed one would ship the secret to every
     visitor's bundle, exactly what spec §23 warns against ("never send privileged
     notification requests directly from the browser"). Its only caller is a
     `import.meta.env.DEV`-gated "Send test notification" button in
     `NotificationsSettings.tsx` that asks for the token via `window.prompt` each time
     and never stores it — verified after `npm run build` that neither the button nor
     the token-bearing call path (`grep` for the button's string and for
     `x-admin-token`) appears anywhere in `dist/`; Rollup tree-shakes the whole branch
     out of production.
   - `package.json` — new dependency: `firebase-admin` (Admin SDK, server-side only,
     `api/`'s runtime — never touches the Vite app's bundle).
   - **To actually test this once deployed:** set `NOTIFICATIONS_TEST_ADMIN_TOKEN` as a
     Vercel environment variable (any long random string), run `npm run dev` locally,
     enable notifications in Profile, click "Send test notification", paste that same
     token when prompted.
6. ✅ **Done** — pantry/history sync + `notifications-dispatch.yml` cron + recommendation-
   engine integration in `api/notifications/dispatch.ts` + fatigue/quiet-hours rules.
   - **Prerequisite that turned out to be missing, built first:** §9 Q3 decided pantry
     and meal history sync to MongoDB opt-in, but nothing implemented it. Added
     `api/sync/pantry.ts` + `api/sync/meal-history.ts` (replace-wholesale, same posture
     as `preferences.ts`), and `src/lib/notifications/dataSync.ts` — started/stopped by
     a new `useDataSync()` hook in App.tsx, mirroring `useForegroundNotifications()`'s
     dynamic-import-behind-`enabled` shape. Debounced (3s) subscriptions to `usePantry`/
     `useKitchen`, plus an immediate push on enable. Profile's "Data" section copy now
     says so once notifications are on (§3's promised amendment).
     `pantryContextIds`/`expiringSoon` (from `state/pantry.ts`) and
     `recentlyCookedNumbers` (from `state/kitchen.ts`) were split into
     `src/domain/pantry.ts` / `src/domain/kitchenHistory.ts` — pure, no zustand — since
     the originals call `persist(...)`, which touches `localStorage` at module load and
     would crash under Node the moment `api/` imported them.
   - **Not yet closed:** `usePrefs` (diet, equipment, budget/time defaults) still isn't
     synced — only pantry + history were ever scoped for sync (§9 Q3). `dispatch.ts`
     hardcodes `diet: 'any'`, meaning a vegetarian user could in principle get an
     egg-dish notification. Real gap, not silently glossed over; closing it means
     extending the sync the same way pantry/history were.
   - **`api/notifications/dispatch.ts`** — cron-only (`x-admin-token` against
     `NOTIFICATIONS_CRON_SECRET`, same `api/_lib/auth.ts` as Phase 5's test endpoint).
     Per enabled device: resolve preferences (deep-merged over defaults so a doc missing
     a field never reads as `undefined`) → skip if the master switch is off → quiet
     hours → which meal window (spec §12's defaults; `midnight` isn't in
     `NotificationPreferences.meals` — that shape shipped in Phase 4 without it — so it
     borrows the `supper` toggle as its gate, and default quiet hours already cover it
     for anyone who hasn't deliberately narrowed that window) → daily limit → load the
     device's pantry/history snapshot → `rankRecipes` (reused directly, not
     reimplemented, per spec §10) → classify each candidate into spec §15's priority
     categories (pantry-expiry 95, pantry-match 90, leftover-rescue 85, budget 80, meal
     60 — ingredient-expiry and leftover detection both reuse `expiringSoon`, there's no
     separate "flag this as a leftover" feature in the app to hang real leftover-rescue
     off of) → pick the highest-priority classified candidate that's both enabled in
     preferences and clear of duplicate-recipe (3 days) / same-category cooldown (3h) →
     send via `api/_lib/fcm.ts`, log to `notificationHistory`. Every device logs a
     structured decision either way (spec §30), sent or skipped.
   - Not implemented, and said so rather than faked: spec §14's "recent app activity
     suppression" (no signal exists — `lastSeenAt` only updates on device
     (re)registration, not general app use, so it wouldn't reflect real activity) and
     "gradually reduce frequency for ignored notifications" (needs open-rate data,
     which needs `openedAt` tracking — that's Phase 7). Re-engagement (priority 20, no
     preference toggle) isn't generated yet either.
   - `.github/workflows/notifications-dispatch.yml` — `schedule: '*/30 * * * *'` +
     `workflow_dispatch` for manual runs, `curl`s the dispatcher with
     `NOTIFICATIONS_CRON_SECRET` (new repo secret, same value as the Vercel env var) and
     reuses the existing `VITE_API_BASE_URL` secret for the endpoint.
   - **A real risk, verified as far as locally possible, not fully provable without an
     actual deploy:** `dispatch.ts` is the first `api/` file to transitively import
     `src/domain/recommend.ts` → `src/domain/effort.ts`/`src/data/catalog.ts`, which
     loads two JSON files and previously used extensionless imports — exactly the class
     of thing that crashed Phase 3 at runtime (see Phase 3's `.js`-extension fix above).
     Fixed the same way (`.js` extensions throughout, plus `with { type: 'json' }` on
     the two JSON imports in `catalog.ts` — the modern, standards-track syntax Node's
     own ESM loader asks for). Verified: `npm run typecheck:api` clean, `npm run build` /
     `vitest run` still pass (this file is shared with the browser bundle, so it has to
     keep working there too), and reverse-engineered `@vercel/node`'s actual compilation
     path from its installed source (`ts.transpileModule`, not esbuild) to confirm the
     syntax survives that specific transform. Still: this exact combination (JSON import
     attributes reaching Vercel's Node runtime) has never actually been exercised in
     production. **First thing to check after deploying this phase:** trigger the
     workflow manually (`workflow_dispatch`) or call `api/notifications/dispatch.ts`
     directly and read the Vercel function logs — if `catalog.ts`'s JSON imports are
     going to fail at runtime, that's where it'll show up.
   - Added `api/_lib/time.ts` (timezone-aware local-time/window math, no date-library
     dependency) with its own test file, `api/_lib/time.test.ts` — the wraparound logic
     (quiet hours and the midnight window both cross local midnight) is easy to get
     subtly wrong and is exercised there, including actual UTC-offset timezone cases.
7. ✅ **Done** — deep-link open tracking (`openedAt`) + Firebase Analytics events (spec
   §19/§20). `notificationHistory` itself was already being written by Phases 5/6; this
   phase closes the loop on *reading* it back.
   - **Click → `openedAt`, end to end:** `api/_lib/history.ts` now generates the Mongo
     `_id` *before* sending (`newNotificationId()`), so it can travel inside the FCM
     `data` payload as `notifId`. `src/sw.ts`'s `notificationclick` handler (and
     `foreground.ts`'s equivalent) append it to the deep-link URL as `?notif=<id>` via
     the one shared helper both paths call, `src/lib/notifications/payload.ts` (spec
     §18: "keep behavior consistent" between foreground/background). A new
     `useNotificationOpenTracking()` hook in App.tsx reads that param on every route
     change, calls the new `POST /api/notifications/opened` (`deviceId`-scoped — a
     device can only mark its own rows), and strips the param via `navigate(...,
     {replace:true})` so a refresh doesn't re-fire it.
   - **Firebase Analytics** — `src/lib/notifications/analytics.ts`, a thin
     `logEvent` wrapper, dynamically imported everywhere it's used (same "never touches
     the initial bundle" rule as the rest of this feature — verified via `npm run
     build` + grep, same technique as Phase 5's test button). Needs its own
     `VITE_FIREBASE_MEASUREMENT_ID` (optional — unset just means analytics stays off).
     Wired: `notification_permission_requested/_granted/_denied`, `notification_enabled/
     _disabled` (from `NotificationsSettings.tsx`'s enable/disable handlers),
     `notification_opened` + `notification_recipe_viewed` (from the open-tracking hook
     above).
   - **Not wired, stated rather than faked:** `notification_received` and
     `notification_dismissed` — the Analytics Web SDK needs a normal window/tab context
     (gtag.js, IndexedDB) and isn't reliably usable from `src/sw.ts`'s service-worker
     scope, so a push arriving while the app is backgrounded/closed, or dismissed
     without a click, has no analytics signal from this app. `smart_notification_
     generated/_skipped` and the `pantry_/budget_/leftover_notification_generated`
     events are server-side decisions `dispatch.ts` already logs structurally (spec
     §30) — mirroring them into Firebase Analytics too would need the GA4 Measurement
     Protocol (a separate server-to-GA4 integration, not the client SDK used here),
     out of scope for this pass. `notification_recipe_started/_completed` tied
     specifically to a notification-originated session also isn't tracked — would need
     session-scoped attribution this app doesn't have anywhere yet.
   - Phase 6's fatigue-reduction gap ("gradually reduce frequency for ignored
     notifications") is now *unblocked* (`openedAt` exists to compute open rate from)
     but still not implemented — `dispatch.ts` doesn't read it yet.
8. Weekly-summary data model (architecture only, per spec §21).

Each phase ships independently reviewable/testable, per the spec's own §34 instruction
not to build all of this in one pass.
