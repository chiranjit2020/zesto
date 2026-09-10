-- Zesto · content schema (public, read-only to clients)
-- The app ships a committed JSON seed and runs fully offline without Supabase. When
-- Supabase is configured, this is the source of truth the seed script populates and
-- the client reads through RLS-guarded views.

create extension if not exists "pgcrypto";

-- ---------- reference ----------
create table equipment (
  id            text primary key,           -- 'one-pan', 'kettle', ...
  label         text not null,
  sort          int  not null default 0
);

create table ingredients (
  id             text primary key,          -- canonical slug: 'egg', 'onion', ...
  name           text not null,
  category       text not null,
  is_staple      boolean not null default false,
  shelf_life_days int,
  created_at     timestamptz not null default now()
);
create index on ingredients (category);

create table tags (
  id     text primary key,                  -- 'diet:egg', 'situational:midnight', ...
  kind   text not null,                     -- 'diet' | 'situational' | 'time' | 'budget' | ...
  label  text not null
);

-- ---------- recipes ----------
create table recipes (
  id                  uuid primary key default gen_random_uuid(),
  number              int  not null unique,          -- 1..99 from the book
  slug                text not null unique,
  title               text not null,
  tagline             text not null,
  chapter             text not null,
  meal_type           text not null default 'any',
  time_text           text not null,
  time_minutes        int  not null,
  needs_precooked_base boolean not null default false,
  headline_cost_inr   int  not null,
  estimated_cost_inr  int  not null,
  serves              int  not null default 1,
  equipment_text      text not null,
  level               text not null,
  why_youll_love_it   text not null,
  money_hack          text not null,
  swap_it             text,
  cost_breakdown_text text not null,
  closing_line        text,
  source              text not null default '99 Recipes Under 99',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on recipes (estimated_cost_inr);
create index on recipes (time_minutes);
create index on recipes (meal_type);

create table recipe_ingredients (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references recipes(id) on delete cascade,
  ingredient_id text references ingredients(id),
  raw_text      text not null,
  quantity      numeric,
  unit          text,
  optional      boolean not null default false,
  position      int not null default 0
);
create index on recipe_ingredients (recipe_id);
create index on recipe_ingredients (ingredient_id);

create table recipe_steps (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references recipes(id) on delete cascade,
  position      int not null,
  text          text not null,
  timer_seconds int,
  unique (recipe_id, position)
);
create index on recipe_steps (recipe_id);

create table recipe_equipment (
  recipe_id    uuid not null references recipes(id) on delete cascade,
  equipment_id text not null references equipment(id),
  primary key (recipe_id, equipment_id)
);

create table recipe_tags (
  recipe_id uuid not null references recipes(id) on delete cascade,
  tag_id    text not null references tags(id),
  primary key (recipe_id, tag_id)
);

create table recipe_nutrition (
  recipe_id  uuid primary key references recipes(id) on delete cascade,
  calories   int not null,
  protein_g  numeric not null default 0,
  carbs_g    numeric not null default 0,
  fat_g      numeric not null default 0,
  fibre_g    numeric not null default 0,
  basis      text not null default 'heuristic-estimate',   -- never claim medical grade
  confidence text not null default 'low'
);

create table recipe_cost_items (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  item      text not null,
  cost_inr  int not null,
  position  int not null default 0
);
create index on recipe_cost_items (recipe_id);

-- ---------- read model ----------
create view recipes_full as
select
  r.*,
  n.calories, n.protein_g, n.carbs_g, n.fat_g, n.fibre_g, n.basis as nutrition_basis,
  coalesce(
    (select array_agg(re.equipment_id) from recipe_equipment re where re.recipe_id = r.id),
    '{}'
  ) as equipment,
  coalesce(
    (select array_agg(rt.tag_id) from recipe_tags rt where rt.recipe_id = r.id),
    '{}'
  ) as tags
from recipes r
left join recipe_nutrition n on n.recipe_id = r.id;

-- ---------- RLS: content is world-readable, writes are service-role only ----------
alter table equipment            enable row level security;
alter table ingredients          enable row level security;
alter table tags                 enable row level security;
alter table recipes              enable row level security;
alter table recipe_ingredients   enable row level security;
alter table recipe_steps         enable row level security;
alter table recipe_equipment     enable row level security;
alter table recipe_tags          enable row level security;
alter table recipe_nutrition     enable row level security;
alter table recipe_cost_items    enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'equipment','ingredients','tags','recipes','recipe_ingredients','recipe_steps',
    'recipe_equipment','recipe_tags','recipe_nutrition','recipe_cost_items'
  ]
  loop
    execute format('create policy %I_read on %I for select using (true);', t, t);
  end loop;
end $$;

-- updated_at trigger
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger recipes_updated_at before update on recipes
  for each row execute function set_updated_at();
