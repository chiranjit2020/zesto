-- Zesto · personal data. Every row is owned by exactly one user; RLS enforces
-- user_id = auth.uid() on all operations. The anon key is the only key the client
-- ever sees (§27, §39).

-- ---------- profile & preferences ----------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at  timestamptz not null default now()
);

create table user_preferences (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  diet                text not null default 'any',       -- 'any' | 'vegetarian' | 'egg'
  equipment_owned     text[] not null default '{one-pan}',
  default_budget_inr  int,
  default_time_minutes int,
  default_max_effort  text,
  servings            int not null default 1,
  liked_tags          text[] not null default '{}',
  updated_at          timestamptz not null default now()
);

-- ---------- pantry ----------
create table pantry_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  ingredient_id text not null references ingredients(id),
  quantity      numeric,
  unit          text,
  expiry        date,
  est_value_inr numeric,
  added_at      timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, ingredient_id)
);
create index on pantry_items (user_id, ingredient_id);
create index on pantry_items (user_id, expiry);

-- ---------- favorites & history ----------
create table favorites (
  user_id       uuid not null references auth.users(id) on delete cascade,
  recipe_number int not null,
  created_at    timestamptz not null default now(),
  primary key (user_id, recipe_number)
);

create table meal_history (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  recipe_number      int not null,
  cooked_at          timestamptz not null default now(),
  servings           int not null default 1,
  actual_cost_inr    numeric,
  rating             int check (rating between 1 and 5),
  was_leftover_rescue boolean not null default false,
  delivery_avoided   boolean not null default false
);
create index on meal_history (user_id, cooked_at desc);

-- ---------- planning ----------
create table meal_plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  week_start       date not null,
  weekly_budget_inr int,
  people           int not null default 1,
  created_at       timestamptz not null default now()
);
create index on meal_plans (user_id, week_start);

create table meal_plan_items (
  id            uuid primary key default gen_random_uuid(),
  meal_plan_id  uuid not null references meal_plans(id) on delete cascade,
  day           text not null,
  slot          text not null,
  recipe_number int not null
);
create index on meal_plan_items (meal_plan_id);

create table shopping_lists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  meal_plan_id uuid references meal_plans(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table shopping_list_items (
  id               uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references shopping_lists(id) on delete cascade,
  ingredient_id    text references ingredients(id),
  label            text not null,
  recipe_count     int not null default 1,
  checked          boolean not null default false
);
create index on shopping_list_items (shopping_list_id);

create table challenge_progress (
  user_id      uuid not null references auth.users(id) on delete cascade,
  challenge_id text not null,
  progress     int not null default 0,
  completed_at timestamptz,
  primary key (user_id, challenge_id)
);

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','user_preferences','pantry_items','favorites','meal_history',
    'meal_plans','shopping_lists','challenge_progress'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$create policy %1$s_owner on %1$I
      using (user_id = auth.uid()) with check (user_id = auth.uid());$f$, t);
  end loop;
end $$;

-- profiles keys on id, not user_id
drop policy profiles_owner on profiles;
create policy profiles_owner on profiles
  using (id = auth.uid()) with check (id = auth.uid());
drop policy user_preferences_owner on user_preferences;
create policy user_preferences_owner on user_preferences
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- child tables inherit ownership through their parent
alter table meal_plan_items enable row level security;
create policy meal_plan_items_owner on meal_plan_items using (
  exists (select 1 from meal_plans p where p.id = meal_plan_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from meal_plans p where p.id = meal_plan_id and p.user_id = auth.uid())
);

alter table shopping_list_items enable row level security;
create policy shopping_list_items_owner on shopping_list_items using (
  exists (select 1 from shopping_lists s where s.id = shopping_list_id and s.user_id = auth.uid())
) with check (
  exists (select 1 from shopping_lists s where s.id = shopping_list_id and s.user_id = auth.uid())
);

-- provision a profile + preferences row on signup
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  insert into user_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();
