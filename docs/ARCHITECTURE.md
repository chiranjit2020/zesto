# Zesto — Architecture & Design Decisions

> Following the process in §48 of the master prompt: PDF analysis → requirements →
> entities → information architecture → recommendation model → design system →
> database schema → app architecture → MVP scope → implementation.

---

## STEP 1–2 · What the PDF actually is

Source: **"99 Recipes Under ₹99 — Quick, Cheap and Ridiculously Easy Meals for Students
Who Are Broke, Busy and Hungry"** (230 pages, © 2026).

It is **not** a generic cookbook. Its stated thesis (Welcome, p6–7) is the exact problem
Zesto is meant to solve:

> "what can I make right now, with what I have, without spending money I don't have?"

Every one of the 99 recipes uses a **fixed, scannable layout** (p8, "How This Book Works"):

| Field | Example | Notes |
|---|---|---|
| Title | `42. Egg Fried Rice` | numbered 1–99 |
| One-line mood | "The one-pot classic…" | when you'd want this |
| `TIME` | `12 min` | realistic total incl. waiting; a few are "with pre-cooked rice" |
| `COST` | `₹24` | headline estimate |
| `SERVES` | `1` | almost always one hungry person |
| `EQUIPMENT` | `One pan` | minimum required — kettle / microwave / one pan / one pot / tawa / rice cooker / no cooking |
| `LEVEL` | `Beginner` or `Easy` | never real skill |
| Why You'll Love It | prose | the pitch / one technique tip |
| Ingredients | `• 2 eggs` … | small practical quantities, some `(optional)` |
| Method | numbered steps | broken down for people who have never cooked |
| Money Hack | prose | how to stretch / save |
| Swap It | prose *(optional)* | substitution when missing something |
| Cost Breakdown | `Eggs — ₹14, Bread — ₹4 … Estimated total — ₹20.` | itemised |
| Closing line | one supportive sentence | |

The book also ships **authoritative cross-reference indexes** (p225–229) we treat as ground
truth for tagging: By Cooking Time, By Approximate Cost, By Equipment, Vegetarian (79),
Egg (20), Late-Night, "Almost Nothing Left" (#97–99). Plus curated situational lists that
map 1:1 onto Zesto's home modes:

- **10 Recipes for When You're Too Tired to Cook** → `😵 I'm too tired`
- **10 Midnight Hunger Fixes** → `🌙 Midnight hunger`
- **10 Filling Meals Under ₹30** / **10 Meals for the Last Week of the Month** → `🪙 I'm broke`
- **5 Recipes for When You Miss Home** → comfort surfacing
- **The ₹99 Emergency Meal Formula**: `BASE + PROTEIN + VEGETABLE + FLAVOUR` (p14) → `₹99 improviser`
- **Weekly Food Planner** + **Weekly Budget Planning Examples** (₹500 / ₹1000 / ₹1500) → `📅 Plan my week`

### What the PDF does **not** contain

- **No nutrition data of any kind.** Calories/macros are required by the product
  (§9, §13, test scenario 6) but must not be fabricated as precise. Decision: derive a
  **heuristic estimate** from canonicalised ingredient quantities against a small
  nutrition table, and label it everywhere as *"~ estimated, low confidence"*. Stored with
  `basis: "heuristic-estimate"` so a real source can replace it later without schema change.
- **Headline `COST` and `Cost Breakdown` totals disagree** for ~40 recipes (the book's own
  approximation — its disclaimer, p5, says costs are "a rough guide, not a guarantee").
  We keep **both** (`headline_cost_inr`, `estimated_cost_inr`) and use the itemised total as
  canonical because the indexes and closing lines corroborate it.
- **Effort** is described qualitatively ("barely any standing up", "one pile of dishes")
  but never scored. We compute an **Effort Score** (§16) from structured signals.

---

## STEP 3 · Content pipeline (`scripts/`)

```
99 Recipes Under 99-2.pdf
  └─ scripts/extract_text.py     (PyMuPDF → plain text, de-hyphenated)
  └─ scripts/parse_pdf.py        (→ recipes_raw.json: 99 recipes, every field, validated
                                   against the book's QC summary: 99 / 20 egg / 79 veg /
                                   82 under-15-min / 13 no-cook — all matched exactly)
  └─ scripts/canonicalize.py     (ingredient strings → 82 canonical ingredients w/ category
                                   + staple flag; heuristic nutrition; tag derivation)
  └─ src/data/recipes.json       (committed seed — the CONTENT FOUNDATION)
  └─ src/data/ingredients.json
```

The seed is committed so the app builds with zero external dependencies. Re-running the
pipeline regenerates it deterministically. Growing from 99 → 5,000 recipes (§43) is "add
rows"; nothing in the app hard-codes recipe content.

---

## STEP 4 · Information architecture

Home is a **question**, not a catalogue (§32, §52). Five-tab mobile nav
(Home · Discover · Pantry · Planner · Profile). Situational **modes** are the primary
entry points and are just pre-configured constraint sets fed to one engine:

| Mode | Pre-set constraints |
|---|---|
| 🍳 What can I make? | pantry ingredients, progressive budget/time/effort |
| 🪙 I'm broke | `budget ≤ ₹20–30`, sort by cost |
| 😵 I'm too tired | `effort = very-low`, no-cook / one-vessel, minimal cleanup |
| 🌙 Midnight hunger | quiet + low-cleanup + quick, dark themed surface |
| ♻️ Use my leftovers | leftover ingredients → `uses-leftovers`, ingredient-reuse weighted |
| 🧺 My pantry | `have-all` / `have-most` from pantry |
| 📅 Plan my week | budget + people + diet → 7-day plan + aggregated shopping list |
| 🎲 Surprise me | constraints → single ranked pick, playful reveal |

---

## STEP 5 · The Zesto Decision Engine (`src/domain/recommend.ts`)

**Deterministic, transparent, modular** (§10 — explicitly *not* opaque AI for MVP).

```
score(recipe, context) = Σ  wᵢ · fᵢ(recipe, context)      // fᵢ ∈ [0,1]
```

| Factor `fᵢ` | Meaning | Default weight |
|---|---|---|
| `ingredientMatch` | fraction of recipe's non-staple ingredients the pantry covers (optional ingredients half-weight) | 0.34 |
| `budgetFit` | 1 if `cost ≤ budget`; ramps to 0 by `2×budget` | 0.18 |
| `timeFit` | 1 if `time ≤ limit`; ramps down | 0.12 |
| `effortFit` | `1 − |recipeEffort − maxEffort| / 4`, clamped | 0.12 |
| `equipmentFit` | 1 if recipe's equipment ⊆ available; 0 otherwise (hard-ish) | 0.10 |
| `nutritionFit` | overlap of estimated calories with chosen band | 0.06 |
| `dietFit` | veg/egg preference respected (veg pref + egg recipe ⇒ 0, hard) | 0.04 |
| `leftoverBoost` | recipe consumes a flagged leftover / day-old item | 0.03 |
| `history` | small penalty if cooked in last 3 days, small boost for liked tags | 0.01 |

Weights live in one config object → tunable, A/B-able, replaceable by a learned model later
without touching callers. Every result carries a **`reasons[]`** array
("You already have 4/5 ingredients", "Best match for your ₹25 budget") built from the
same factors, so the UI never has to re-derive *why*.

Hard filters (applied before scoring) only for **diet** (never show egg to a vegetarian) and
**equipment** when the user says "No cooking". Everything else **ranks** — per §9 the engine
ranks, it does not just filter — and the "nothing matches, relax one of these?" empty state
(§42) is generated by finding the single constraint whose relaxation adds the most results.

---

## STEP 6 · Design system (`src/styles/tokens.css`, `src/components/ui/`)

- **Type:** Quicksand (self-hosted via `@fontsource`), 400/500/600/700. One modular scale
  (1.20 ratio), `clamp()` for display sizes.
- **Colour:** the official logo palette (`zesto-logo.jpg`) — purple `#9035C0`, electric blue
  `#4CBDF7`, yellow `#FDCF00` / amber `#F7B200`, near-black `#0A0A12`. Used **for meaning**
  (primary action, active, progress, recommendation confidence, mode accents, brand moments),
  never as blanket gradient. Full light + dark palettes as CSS custom properties; dark is the
  Midnight surface too.
- **Icons:** one registry (`components/ui/Icon.tsx`) mapping semantic names → `lucide-react`
  (MIT). Replaces every emoji. Each situational mode has a signature reduced-motion-safe
  animation (`zi-*` keyframes) — a mount pop, plus hover/tap motion or a slow ambient loop
  (moon breathes, low-battery pulses). The ribbon-Z (`ZMark`) is still the loading + cook-
  progress mark.
- **Confidence colour ramp:** red-amber-green mapped to score, used on the match bar.
- **Primitives:** `Button`, `IconButton`, `Card`, `Chip`, `Stat`, `MetricTile`, `ProgressRing`
  (the Zesto ribbon-Z as the progress mark), `Sheet`/`Dialog`, `SegmentedControl`,
  `RangeSlider`, `TabBar`, `EmptyState`, `Skeleton`, `OfflineBanner`, `Toast`.
- **No card soup** (§30): sections use whitespace + heading hierarchy; cards reserved for
  discrete tappable objects (recipe, result, metric).
- **Motion:** only for progress / state change / hierarchy; all wrapped in
  `@media (prefers-reduced-motion)`.

---

## STEP 7 · Data model & persistence

**There is no database.** §38 is explicit: *do NOT initially build complex backend
infrastructure*. 99 recipes plus a handful of small per-user collections do not warrant
one, and a static PWA on GitHub Pages has nothing to run a server process on.

**Content** — compiled into the app as `src/data/*.json` (the CONTENT FOUNDATION),
loaded and indexed once by `catalog.ts`. Normalised in spirit — `Recipe` has
`ingredients[]`, `steps[]`, `equipment[]`, `costBreakdownItems[]`, `nutrition`,
`tags[]` — so the same objects would map cleanly onto tables later. Growing to 5,000+
recipes is "more rows in the seed"; past ~1,000 the seed becomes a fetched, precached
asset backed by IndexedDB, and `catalog.ts` is the only file that changes.

**Personal state** — five small collections, each a `zustand` store persisted to
`localStorage`, private to the device:

| store | holds |
|---|---|
| `prefs` | diet, equipment owned, default budget/time/effort, servings, theme, liked tags |
| `pantry` | `{ ingredientId, quantity, unit, expiry, estValueInr, addedAt }[]` |
| `kitchen` | `meal_history[]` (recipe, cookedAt, cost, servings, rating, leftover-rescue, delivery-avoided) + `favorites[]` |
| `cook` | the in-progress guided-cook session (recipe, step, completed steps) — survives a reload |
| *(planner output is derived, not stored)* | |

Reads and writes are synchronous and offline by construction. Each store's action
surface is deliberately the shape a server collection would mirror 1:1, so adding
cross-device sync later is a wrapper around the existing actions — not a re-model.
That later backend (serverless `/api/*` + any datastore + a device/JWT identity) is
**out of MVP scope**; nothing in `domain/` or `routes/` would change.

---

## STEP 8 · Application architecture

```
UI (React 18 + TS, routes/ + components/)
  ↓            props / hooks only — no data or domain logic in components
Application hooks (src/app/*)   useDecisionContext, useApplyTheme, useInstallPrompt …
  ↓
Domain (src/domain/*)          recommend · cost · effort · plan · search · challenges
  ↓                            — pure, deterministic, unit-tested, zero I/O
State (src/state/*)            Zustand + persist — prefs · pantry · kitchen · cook
  ↓                            (localStorage; each store is the local repo)
Catalog (src/data/catalog.ts) loads the committed JSON seed, derives effort, indexes it

No server. GitHub → GitHub Pages (static), via .github/workflows/deploy.yml.
Served under base '/zesto/'; a build-time 404.html copy handles SPA deep links.
```

- **Offline-first is the default path, not a fallback** (§7). The recipe catalog is a
  committed JSON module precached by the service worker; pantry / saved / history /
  cook-session are Zustand stores persisted to `localStorage`. Everything — browse,
  search, pantry match, recommendations, cooking mode, dashboard — runs with no network.
- **Why Zustand + localStorage, not a database anywhere** — §38 warns against
  "overengineered state management" and "complex backend infrastructure". 99 recipes +
  five small user collections need neither an in-browser database nor a server. The
  `state/*` stores expose exactly the shape a server collection would mirror, so adding
  cross-device sync later is a wrapper around the store actions, not a rewrite.
- **The catalog is its own build chunk** (`manualChunks` in `vite.config.ts`). App shell
  is ~16 KB gzip + ~54 KB vendor; the recipe data (~78 KB gzip) loads in parallel and is
  cached permanently. Past roughly a thousand recipes this becomes a fetched, precached
  asset backed by IndexedDB — the `catalog.ts` seam is the only thing that changes.
- **PWA:** `vite-plugin-pwa` (Workbox, `generateSW`). Precaches the shell, catalog chunk,
  fonts and icons; `navigateFallback` → `/offline.html`; runtime `CacheFirst` for fonts
  and icons. Real manifest, maskable icon, `display: standalone`, theme-color splash.
- **Stack:** Vite · React Router · Zustand + persist · Tailwind (CSS-variable tokens) ·
  vite-plugin-pwa · Vitest + Testing Library. No runtime dependency needs a server.

---

## STEP 9 · MVP scope (what this repo ships)

**Phase 1 (complete):** seeded recipe DB · Discover browse + faceted search/filter · Pantry
CRUD · What-Can-I-Make · the decision engine + reasons · Recipe detail (have/need split) ·
Guided cooking mode (step-by-step, timers, wake-lock, progress-Z) · installable PWA · full
offline core.

**Phase 2 (in this repo):** budget / tired / midnight / leftover / surprise modes · effort
scoring · favorites · recently-cooked · nutrition estimates · "relax a constraint" empty state.

**Phase 3 (partial):** weekly planner + aggregated shopping list · meal history · spending &
calorie mini-dashboard.

**Phase 4–5 (partly built / architected):** challenges + cooking streak (built, on the
Profile screen) · share via Web Share API + a static OG card (built) · per-recipe
generated share images · cross-device sync + accounts · learned scoring. The store
seam and the `preferredNumbers` engine hook make each additive.

---

## STEP 10 · Security & quality notes

- No server, no database, no secrets — nothing to leak. Everything ships as static
  assets; all user data stays in the browser it was entered on.
- No `dangerouslySetInnerHTML`; all recipe text rendered as text.
- `localStorage` reads/writes are wrapped so a private-mode or quota failure degrades
  to an empty state rather than a crash.
- a11y: semantic landmarks, focus rings, 44px targets, live regions for cook-step changes,
  reduced-motion, AA contrast in both themes.
- Perf budget: < 120 KB gzipped initial JS; route-level code splitting; recipe images are
  CSS/gradient art (no photography) so the whole catalogue is offline-cheap.
