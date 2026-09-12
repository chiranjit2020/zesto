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
pantrySnapshots           { userId, items[], updatedAt }   -- NEW, see §9 question 3
mealHistorySnapshots      { userId, entries[], updatedAt } -- NEW, see §9 question 3
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
5. Manual test-notification path (spec §28), admin-gated. *(current step)*
6. `notifications-dispatch.yml` cron + recommendation-engine integration in
   `api/notifications/dispatch.ts` + fatigue/quiet-hours rules.
7. `notificationHistory` + analytics events + deep-link click handling.
8. Weekly-summary data model (architecture only, per spec §21).

Each phase ships independently reviewable/testable, per the spec's own §34 instruction
not to build all of this in one pass.
