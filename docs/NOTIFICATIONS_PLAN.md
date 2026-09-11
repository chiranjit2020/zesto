# Push notifications — architecture summary & gap analysis

> Required by `notification-prompt.md` §37 before any code is written. This is that
> deliverable: what exists today, where the spec's assumptions don't match this repo,
> and a realistic phased plan. Lives on `feature/push-notifications` only — `main` is
> untouched until this is ready to merge.

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
  `localStorage`, which a server-side Cloud Function cannot read. This is the crux of
  §4 below.
- **Recipe catalog** (`src/data/*.json` via `src/data/catalog.ts`) — Cloud Functions
  need read access to the same recipe data to score candidates. Since it's a committed
  JSON module, the simplest path is shipping the same JSON as a Functions dependency
  (keep one content source, imported in two runtimes) rather than duplicating it in
  MongoDB.
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
  the existing "Preferences" section.
- `src/App.tsx` — register the Firebase Messaging service worker alongside the PWA one
  (see §6), mount a notification-permission prompt component contextually (spec §5).
- `vite.config.ts` — `vite-plugin-pwa` config needs to either import Firebase Messaging
  into its generated worker or switch strategies (see §6).
- `.env.example` — new Firebase web config keys, `VITE_`-prefixed for the client bundle.
- `package.json` — new dependency: `firebase` (Web SDK). Cloud Functions live in their
  own `functions/` package with their own `package.json` (Node runtime, separate from
  the Vite app).
- `.github/workflows/deploy.yml` — no change needed for the frontend if we keep GitHub
  Pages (see §9, question 2) — Cloud Functions deploy independently via `firebase
  deploy`, which doesn't care what serves the static frontend.

## 4. New files required (once §9 is answered)

```
functions/                          # Firebase Cloud Functions (separate Node package)
  src/
    scheduledNotificationDispatcher.ts   # Cloud Scheduler → evaluates all eligible users
    evaluateNotification.ts              # user+context → send/skip decision
    lib/recommend.ts                     # thin re-export/port of src/domain/recommend.ts
    lib/mongo.ts                         # connection helper, indexes
    lib/fcm.ts                           # admin SDK send wrapper
    api/registerDevice.ts                # HTTPS callable: store notificationDevices doc
    api/updatePreferences.ts             # HTTPS callable: store notificationPreferences
    api/testNotification.ts              # gated dev-only test send (spec §28)
  package.json
public/
  firebase-messaging-sw.js            # or merged into the vite-pwa worker, see §6
src/
  lib/notifications/
    firebase.ts                       # initializeApp + getMessaging (client)
    permission.ts                     # contextual prompt state machine (§5)
    api.ts                             # client → Cloud Functions HTTPS calls
  components/NotificationsSettings.tsx
  components/NotificationPermissionPrompt.tsx
docs/
  NOTIFICATIONS_PLAN.md               # this file
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

## 7. Firebase services required

- Firebase project (Blaze/pay-as-you-go plan — **2nd-gen Cloud Functions require
  billing enabled**, even if usage stays inside the free-tier quota)
- Cloud Messaging (Web Push, needs a VAPID key pair generated in the console)
- Cloud Functions 2nd gen (Node runtime)
- Cloud Scheduler (provisioned automatically by a Functions `onSchedule` trigger)
- Firebase Analytics (web)

## 8. Environment variables (`.env.example` additions)

```
# client (VITE_ prefix → bundled, so these must be the public web config only)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=

# functions/ only (never in the client bundle)
MONGODB_URI=
FIREBASE_SERVICE_ACCOUNT_JSON=       # or use Application Default Credentials on deploy
NOTIFICATIONS_TEST_ADMIN_TOKEN=      # gates POST /api/notifications/test (spec §28)
```

The Firebase **client** web config (`VITE_FIREBASE_*`) is not a secret — it's the same
config shipped to every browser by design; MongoDB and the service-account key are the
only real secrets here, and they live only in `functions/` (deployed via `firebase
functions:secrets:set`, never in a client env file).

---

## 9. Open questions — genuinely blocking, not process for its own sake

These aren't things I can resolve by inspecting the repo further; they're either
external account creation only you can do, or product decisions the spec doesn't
actually settle for this codebase.

1. **Do you already have a Firebase project and a MongoDB Atlas cluster?** If not,
   these need to exist before Phase 1 can produce anything testable — I can't create
   accounts or provision cloud resources. Once created, I need the client Firebase web
   config (public, safe to paste) and you'd set `MONGODB_URI` / the service-account key
   as local/CI secrets yourself (I'll tell you exactly where).
2. **Keep GitHub Pages, or actually move to Vercel?** The spec assumes Vercel, but
   nothing about Cloud Functions requires it — they deploy independently via the
   Firebase CLI regardless of where the static frontend lives. My default: **keep GitHub
   Pages**, treat "Vercel" in the spec as incidental. Say so if you actually want the
   move for other reasons.
3. **Where does pantry/meal-history data live for the decision engine to read?** Today
   that's `localStorage`-only, by design (§7 above) — a Cloud Function can't see it. To
   score "you already have eggs + bread" server-side, the client needs to **sync a
   snapshot** of pantry/history to MongoDB whenever it changes (new `pantrySnapshots` /
   `mealHistorySnapshots` collections above). That's a real, permanent change to this
   app's privacy model — right now the Profile page states "Everything is stored on
   this device only," and this makes that no longer fully true for users who enable
   notifications. Worth deciding deliberately rather than inheriting it silently from
   the spec.
4. **Given (3), how is a user identified with no login?** A generated anonymous device
   ID (stored in `localStorage`, sent to Functions as `userId`) is the natural fit here
   — no new login flow, consistent with "explore without an account." Confirming that's
   the intent before I bake it into the schema.

## 10. Phased plan (adapted from spec §34, gated on §9)

Unchanged in spirit from the spec's 11 phases, but re-ordered so the service-worker
migration (real risk to existing offline functionality) happens and is verified
*before* any Firebase code touches it, and so nothing after Phase 2 starts before the
answers to §9 exist:

1. Service-worker migration to `injectManifest` — re-verify existing offline behavior
   (recipe browsing, pantry, cook mode, install prompt) — **zero user-visible change**.
2. Firebase project wiring (client SDK, VAPID, permission UX skeleton) — behind a
   feature flag, no-op if unconfigured (spec §29: Firebase unavailable → Zesto still
   works normally).
3. `functions/` package + MongoDB connection + `notificationPreferences` /
   `notificationDevices` collections + device registration endpoint.
4. Preferences UI in Profile ("You") — writes to Functions, not to `localStorage`.
5. Manual test-notification path (spec §28), admin-gated.
6. Scheduled dispatcher + recommendation-engine integration + fatigue/quiet-hours rules.
7. `notificationHistory` + analytics events + deep-link click handling.
8. Weekly-summary data model (architecture only, per spec §21).

Each phase ships independently reviewable/testable, per the spec's own §34 instruction
not to build all of this in one pass.

---

**Nothing beyond this document and the branch itself has been built yet.** Phase 1
(service-worker migration) can start without waiting on §9's answers — it's pure
refactor of what already exists. Everything from Phase 2 onward needs at least
question 1 answered.
