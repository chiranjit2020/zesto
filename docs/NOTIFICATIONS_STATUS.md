# Push notifications — status report

**As of:** 2026-09-13
**Full phase-by-phase detail:** `docs/NOTIFICATIONS_PLAN.md`. This file is a shorter,
status-first summary — what's done, what's live, what's left.

---

## TL;DR

The push-notifications feature (Phases 1–10 of the internal plan, covering 9 of the
original spec's 11 phases) is **built, merged to `main`, deployed, and verified working
against the real production site and Vercel API** — including a real notification
received on a real device and a real scheduled-dispatch run. One optional spec phase
(AI-generated copy) and one non-blocking quality gap (fatigue reduction) remain.

---

## ✅ Done

### Feature phases (see `docs/NOTIFICATIONS_PLAN.md` for full detail on each)

| # | Phase | What it delivers |
|---|---|---|
| 1 | Service-worker migration | Switched to `injectManifest` so one worker handles both offline caching and push — offline behavior re-verified |
| 2 | Firebase client wiring | Permission prompt, FCM token handling, foreground + background message display |
| 3 | Vercel API foundation | `api/` package, device registration, preferences storage (MongoDB) |
| 4 | Preferences UI | Meal-time toggles, smart-suggestion toggles, quiet hours, max-per-day — in Profile |
| 5 | Manual test-send | Admin-gated endpoint + dev-only button to send a real test push through the full pipeline |
| 6 | Scheduled dispatcher | Cron-driven decision engine: quiet hours → daily limit → recommendation-engine scoring → send/skip, logged either way |
| 7 | Open tracking + Analytics | Deep-link clicks marked opened; Firebase Analytics events for the notification funnel |
| 8 | Weekly-summary data model | Architecture only (not wired into the send loop yet) |
| 9 | Notification history UI | In-app list of past notifications in Profile — open, mark read, dismiss |
| 10 | Diet/equipment/budget sync | Closed a real correctness gap — the dispatcher now respects a user's actual diet, equipment, and budget/time preferences instead of ignoring them |

### Production deployment & hardening (2026-09-12 → 13)

Merging and deploying this surfaced several infrastructure problems that had never been
exercised for real before (masked, it turned out, by an access-control setting that had
been silently blocking almost every prior verification attempt). All fixed and confirmed
live:

- Vercel's Deployment Protection (an SSO wall) was blocking every API call, including
  from the real app itself — turned off for both Preview and Production.
- Three Vercel environment variables (`MONGODB_URI`, `NOTIFICATIONS_TEST_ADMIN_TOKEN`,
  `FIREBASE_SERVICE_ACCOUNT_JSON`) were never actually set despite being recorded as
  configured — added and verified.
- A CORS bug: the `x-admin-token` header used by the test-send button was never
  allowlisted — fixed.
- A second CORS bug: the live site resolves at `www.chiranjitkarmakar.com`, but only the
  bare domain was allowlisted — fixed.
- GitHub repository secrets (`VITE_FIREBASE_*`, `VITE_API_BASE_URL`) that the production
  build bakes in were never set — the live site was shipping with notifications silently
  unconfigured. Added and rebuilt.
- `npm run dev` cannot be used to test the enable flow at all (no service worker
  registers in dev mode) — documented; use `npm run build && npm run preview` instead.

**Verified live, end to end, against the real production deployment:**
- Device registration, preferences read/write, notification history read/write
- A real push notification sent and received (manual test-send)
- A real scheduled-dispatch run (`evaluated: 2, sent: 1, skipped: 1`) — a real,
  correctly-classified recommendation-engine pick was sent to a real device
- CORS working correctly from the real `www.chiranjitkarmakar.com` origin

### Small UX addition
- A bell icon in the top header, linking to Profile — a persistent entry point to
  notification settings/history from anywhere in the app.

---

## ⏳ Remaining

| Item | What it is | Why it's not done | Urgency |
|---|---|---|---|
| Fatigue reduction | "Gradually reduce frequency for ignored notifications" (spec §14) | Needs open-rate data from `openedAt` (available since Phase 7) — the throttling logic itself was never built | Low — quality-of-life, not correctness |
| AI-generated notification copy | Optional spec Phase 11 (§22) | Explicitly optional in the spec; the deterministic template engine is already the authoritative copy source | Low — explicitly optional |
| Weekly-summary send loop | Phase 8 built the data model and copy template, but never wired it into `dispatch.ts`'s send loop | Needs a *weekly* (not 3-hour) cooldown that doesn't exist in the dispatcher yet | Medium — feature exists but isn't reachable by users yet |
| Notification-history bulk actions | "Mark all as read", pagination beyond 50 rows | Spec asked for a lightweight history, not a full inbox — deliberately out of scope so far | Low |

**Nothing above blocks the feature working for real users today.** These are the
honest, tracked gaps — none were glossed over; each is called out in
`docs/NOTIFICATIONS_PLAN.md` at the point it was found.

---

## Where things live

- **Plan & full history:** `docs/NOTIFICATIONS_PLAN.md`
- **Original spec:** `notification-prompt.md`
- **Production frontend:** https://www.chiranjitkarmakar.com/zesto/
- **Production API:** https://zesto-codeworm.vercel.app
- **Cron dispatcher:** `.github/workflows/notifications-dispatch.yml`, runs every 30 minutes
