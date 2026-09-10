/**
 * Seeds a Supabase project from the committed content foundation (src/data/*.json).
 * Idempotent — upserts by natural key. Requires the SERVICE ROLE key, which lives only
 * in your shell for this one-off script and never in the app.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/seed.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const recipes = JSON.parse(readFileSync(join(here, '../src/data/recipes.json'), 'utf8'));
const ings = JSON.parse(readFileSync(join(here, '../src/data/ingredients.json'), 'utf8'));

const EQUIPMENT = [
  ['no-cook', 'No cooking'], ['kettle', 'Kettle'], ['microwave', 'Microwave'],
  ['one-pan', 'One pan'], ['one-pot', 'One pot'], ['tawa', 'Tawa'], ['rice-cooker', 'Rice cooker'],
];

async function run() {
  await db.from('equipment').upsert(EQUIPMENT.map(([id, label], i) => ({ id, label, sort: i })));

  await db.from('ingredients').upsert(
    ings.ingredients.map((i) => ({
      id: i.id, name: i.name, category: i.category,
      is_staple: i.is_staple, shelf_life_days: i.shelf_life_days,
    })),
  );

  const tagSet = new Map();
  for (const r of recipes.recipes) for (const t of r.tags) tagSet.set(t, t.split(':')[0]);
  await db.from('tags').upsert([...tagSet].map(([id, kind]) => ({ id, kind, label: id })));

  for (const r of recipes.recipes) {
    const { data: rec, error } = await db
      .from('recipes')
      .upsert(
        {
          number: r.number, slug: r.slug, title: r.title, tagline: r.tagline, chapter: r.chapter,
          meal_type: r.meal_type, time_text: r.time_text, time_minutes: r.time_minutes ?? 10,
          needs_precooked_base: r.needs_precooked_base,
          headline_cost_inr: r.headline_cost_inr, estimated_cost_inr: r.estimated_cost_inr ?? r.headline_cost_inr,
          serves: r.serves, equipment_text: r.equipment_text, level: r.level,
          why_youll_love_it: r.why_youll_love_it, money_hack: r.money_hack, swap_it: r.swap_it,
          cost_breakdown_text: r.cost_breakdown_text, closing_line: r.closing_line,
        },
        { onConflict: 'number' },
      )
      .select('id')
      .single();
    if (error) throw error;
    const rid = rec.id;

    await db.from('recipe_ingredients').delete().eq('recipe_id', rid);
    await db.from('recipe_ingredients').insert(
      r.ingredients.map((ing, pos) => ({
        recipe_id: rid, ingredient_id: ing.canonical[0] ?? null, raw_text: ing.raw,
        quantity: ing.quantity, unit: ing.unit, optional: ing.optional, position: pos,
      })),
    );

    await db.from('recipe_steps').delete().eq('recipe_id', rid);
    await db.from('recipe_steps').insert(
      r.steps.map((text, i) => ({ recipe_id: rid, position: i, text })),
    );

    await db.from('recipe_equipment').delete().eq('recipe_id', rid);
    await db.from('recipe_equipment').insert(r.equipment.map((e) => ({ recipe_id: rid, equipment_id: e })));

    await db.from('recipe_tags').delete().eq('recipe_id', rid);
    await db.from('recipe_tags').insert(r.tags.map((t) => ({ recipe_id: rid, tag_id: t })));

    await db.from('recipe_nutrition').upsert({
      recipe_id: rid, calories: r.nutrition.calories, protein_g: r.nutrition.protein_g,
      carbs_g: r.nutrition.carbs_g, fat_g: r.nutrition.fat_g, fibre_g: r.nutrition.fibre_g,
      basis: r.nutrition.basis, confidence: r.nutrition.confidence,
    });

    await db.from('recipe_cost_items').delete().eq('recipe_id', rid);
    await db.from('recipe_cost_items').insert(
      r.cost_breakdown_items.map((c, i) => ({ recipe_id: rid, item: c.item, cost_inr: c.cost_inr, position: i })),
    );

    process.stdout.write(`\rseeded ${r.number}/99`);
  }
  console.log('\ndone.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
