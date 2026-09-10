<div align="center">

# Zesto

**Tell Zesto your situation. Zesto tells you what you can eat.**

A mobile-first PWA that turns a recipe collection into a food *decision engine* —
for when you're broke, tired, out of ideas, and it's already late.

</div>

---

## What this is

Not a digital recipe book. Zesto answers one question, asked on a loop:

> "I'm hungry. I have these ingredients, this much money, this much time, this much
> energy. What can I make?"

You tell it your situation through **situational modes** — `I'm broke`, `I'm too
tired`, `Midnight hunger`, `Use my leftovers`, `What can I make?`, `Make a ₹99 meal`,
`Plan my week`, `Surprise me` — and a transparent, deterministic **decision engine**
ranks the 99 recipes and tells you *why* each one fits.

The recipe content comes entirely from **"99 Recipes Under ₹99 — Quick, Cheap and
Ridiculously Easy Meals"**, parsed into structured data. Nothing is invented.

## Highlights

- **Decision engine** — deterministic weighted scoring across ingredient match, budget,
  time, effort, equipment, calories, diet and leftovers. Every result carries a human
  reason ("You already have 4/5 ingredients", "₹6 under your ₹20 budget"). When nothing
  matches, it suggests the single constraint to relax.
- **Effort Score** — computed from steps, prep verbs, vessels and attention, because a
  10-minute recipe with three pans is not "quick".
- **Pantry** — track what you own; recommendations sharpen; expiry nudges feed the
  leftover engine. Salt, oil and basic spices are assumed.
- **Guided cooking mode** — one step at a time, big targets, inline timers, screen
  wake-lock, resume-after-reload, the ribbon-Z as a progress mark.
- **Weekly planner** — budget + people + diet → 7-day plan + a de-duplicated shopping
  list that optimises ingredient reuse.
- **Weekly dashboard** — meals cooked, money spent, estimated saved vs delivery,
  leftovers rescued, cooking streak, subtle challenges.
- **Real PWA** — installable, offline-first. Recipes, pantry, saved, history and
  cooking mode all work with no connection.
- **Honest numbers** — costs and calories are labelled *estimated* everywhere. The
  book has no nutrition data; calories are a heuristic estimate from ingredient
  quantities, stored as low-confidence.

## Stack

Vite · React 18 + TypeScript · React Router · Zustand (persisted, on-device) ·
Tailwind (tokenised design system) · lucide-react (icons) · vite-plugin-pwa / Workbox ·
Vitest.

**No backend, no database.** The 99 recipes are compiled into the app; everything
personal (pantry, history, favorites, preferences, an in-progress cook) is stored in
the browser per device. The whole stack is **GitHub → GitHub Pages** (static). Cross-
device sync and accounts are a deliberate later phase (§38).

## Getting started

```bash
npm install
npm run dev            # http://localhost:5173/zesto/
npm test               # decision-engine + catalog + smoke tests
npm run build && npm run preview   # http://localhost:4173/zesto/
```

No environment variables. Zesto runs fully offline out of the box, all personal data
on the device. The app is served under `/zesto/` (`base` in `vite.config.ts`).

## The content pipeline

The committed seed (`src/data/recipes.json`, `src/data/ingredients.json`) is the
content foundation. To regenerate it from the source PDF:

```bash
pip install pymupdf
npm run seed:build
```

- `scripts/extract_text.py` — PDF → text (PyMuPDF, de-hyphenated)
- `scripts/parse_pdf.py` — 99 recipes, every field, validated against the book's own
  QC summary (99 recipes / 20 egg / 79 vegetarian / 82 under 15 min / 13 no-cook — all
  matched exactly) and its cross-reference indexes
- `scripts/canonicalize.py` — ingredient strings → 82 canonical ingredients with
  categories and staple flags; heuristic nutrition; derived tags

`npm run assets:build` (`scripts/make_brand_assets.py`) regenerates every PWA icon,
the 16 iOS launch screens, favicons and the OG card from the official logo
(`zesto-logo.jpg`) — each a Lanczos crop of the real artwork, no redrawing.

## Deployment

`GitHub → GitHub Pages`, via `.github/workflows/deploy.yml` on every push to `main`
(build + typecheck + test, then publish `dist/`). `.github/workflows/ci.yml` runs the
same checks on pull requests.

One-time setup:

1. **Repo → Settings → Pages → Source: GitHub Actions.**
2. The app is built with `base: '/zesto/'`, so it lives at
   `https://<user>.github.io/zesto/`.
3. For **`chiranjitkarmakar.com/zesto/`**: a custom apex domain configured on your
   GitHub **user site** (`<user>.github.io`) automatically covers project pages —
   `chiranjitkarmakar.com/zesto/` then resolves to this repo's Pages. Nothing to add
   in this repo. (Without the user-site domain it stays at `<user>.github.io/zesto/`.)

`vite.config.ts` writes a `404.html` copy of `index.html` so SPA deep links
(`/zesto/r/:slug`) resolve on Pages, which has no rewrite config.

### If you later want cross-device sync

The `src/state/*` stores are the seam. Each is a small persisted collection
(`pantry_items`, `meal_history`, `favorites`, `user_preferences`, `meal_plans`) that a
backend would mirror 1:1. Adding sync is additive — wrap the store actions with a
writer that also pushes to `/api/*` serverless routes, and reconcile on reconnect. It
does not touch the domain layer or the UI.

## Project layout

```
src/
  domain/       pure logic — recommend · effort · cost · plan · search · challenges  (tested, no I/O)
  data/         catalog loader + committed JSON seed
  state/        Zustand stores (prefs · pantry · kitchen · cook) — persisted on-device
  app/          hooks that bridge state → domain (useDecisionContext, theme, install)
  components/   design-system primitives (ui/) + recipe components
  routes/       one file per screen
scripts/        the PDF → JSON content pipeline
docs/           ARCHITECTURE.md — the full design rationale (§48 process)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the reasoning behind every major
decision.

## Testing the North Star

`src/domain/recommend.test.ts` encodes the master-prompt acceptance scenarios: rice +
egg + onion under ₹30, only ₹20, exhausted, midnight, leftover rice, a calorie band,
impossible constraints. `npm test` runs them.
