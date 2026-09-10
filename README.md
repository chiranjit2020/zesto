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
Tailwind (tokenised design system) · vite-plugin-pwa / Workbox · Vitest.
Supabase (Postgres + Auth + RLS) is **optional** — see below.

## Getting started

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # decision-engine + catalog + smoke tests
npm run build && npm run preview
```

No environment variables are required — Zesto runs fully offline out of the box, with
all personal data on the device.

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

## Optional: Supabase backend

Enables accounts + cross-device sync for personal data. The app degrades gracefully
to on-device storage when it's absent.

```bash
# 1. create a project, then apply the schema
supabase db push   # or paste supabase/migrations/*.sql into the SQL editor

# 2. seed content (service-role key stays in your shell, never in the app)
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/seed.mjs

# 3. point the app at it
cp .env.example .env   # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

Only the anon key ever reaches the browser. Every personal table has RLS
(`user_id = auth.uid()`); content tables are world-readable.

## Deployment

```
GitHub → Vercel (static build, output: dist) → Supabase (optional)
```

Vercel: framework preset **Vite**, build `npm run build`, output `dist`. Add the two
`VITE_SUPABASE_*` variables only if you're using the backend.

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
supabase/       schema migrations + content seed script
docs/           ARCHITECTURE.md — the full design rationale (§48 process)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the reasoning behind every major
decision.

## Testing the North Star

`src/domain/recommend.test.ts` encodes the master-prompt acceptance scenarios: rice +
egg + onion under ₹30, only ₹20, exhausted, midnight, leftover rice, a calorie band,
impossible constraints. `npm test` runs them.
