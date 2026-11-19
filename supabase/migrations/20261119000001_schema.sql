-- =====================================================================
-- LEVEZA — Esquema principal
-- Todos os timestamps em UTC (timestamptz). Unidades métricas.
-- Cada tabela privada tem user_id → auth.users ON DELETE CASCADE:
-- excluir a conta apaga todos os dados da pessoa.
-- =====================================================================

-- gen_random_uuid() é nativo no Postgres 13+ (Supabase usa 15+).

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Perfil e preferências (1 linha por usuário; id = user_id)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  height_cm numeric(5,1) check (height_cm is null or height_cm between 100 and 250),
  timezone text not null default 'America/Sao_Paulo' check (char_length(timezone) <= 64),
  week_starts_on smallint not null default 1 check (week_starts_on in (0, 1)),
  equation_parameter text not null default 'nao_informado' check (equation_parameter in ('masculino','feminino','nao_informado')),
  activity_level text not null default 'leve' check (activity_level in ('sedentario','leve','moderado','ativo')),
  sleep_routine text check (char_length(sleep_routine) <= 300),
  mode text not null default 'padrao' check (mode in ('padrao','lactante','gestante','menor')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_id_is_user check (id = user_id)
);

create table public.user_preferences (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  water_goal_ml integer not null default 2000 check (water_goal_ml between 500 and 5000),
  cup_sizes_ml integer[] not null default '{200,300,500}',
  photo_retention text not null default 'nao_guardar' check (photo_retention in ('nao_guardar','30_dias','manter')),
  remind_water boolean not null default false,
  remind_fasting boolean not null default false,
  plan52_goals text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prefs_id_is_user check (id = user_id),
  constraint prefs_cups check (array_length(cup_sizes_ml, 1) is null or array_length(cup_sizes_ml, 1) <= 6)
);

-- ---------------------------------------------------------------------
-- Triagem de saúde (histórico: cada revisão é uma nova linha)
-- ---------------------------------------------------------------------
create table public.health_screenings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  birth_date date check (birth_date is null or birth_date >= date '1900-01-01'),
  pregnant text check (pregnant in ('sim','nao','nao_se_aplica')),
  breastfeeding text check (breastfeeding in ('sim','nao','nao_se_aplica')),
  eating_disorder text check (eating_disorder in ('atual','previo','nao','prefiro_nao_dizer')),
  diabetes text check (diabetes in ('tipo1','tipo2','outro','nao','nao_sei')),
  hypoglycemia_meds text check (hypoglycemia_meds in ('sim','nao','nao_sei')),
  clinical_conditions text[] not null default '{}',
  physical_limitations text check (char_length(physical_limitations) <= 500),
  dietary_restrictions text check (char_length(dietary_restrictions) <= 500),
  consent_health_data boolean not null default false,
  consent_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('termos_privacidade','dados_saude','fotos_analise','fotos_treinamento')),
  version text not null,
  granted boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Objetivos e peso
-- ---------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('habitos','manter','perder','ganhar')),
  target_weight_kg numeric(5,1) check (target_weight_kg is null or target_weight_kg between 25 and 400),
  kcal_target integer check (kcal_target is null or kcal_target between 1200 and 6000),
  weekly_rate_kg numeric(4,2) check (weekly_rate_kg is null or abs(weekly_rate_kg) <= 2),
  status text not null default 'ativa' check (status in ('ativa','encerrada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index goals_one_active on public.goals(user_id) where status = 'ativa';

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  measured_at timestamptz not null,
  weight_kg numeric(5,2) not null check (weight_kg between 25 and 400),
  notes text check (char_length(notes) <= 300),
  conditions text check (char_length(conditions) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Alimentação
-- ---------------------------------------------------------------------
create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  eaten_at timestamptz not null,
  meal text not null check (meal in ('cafe','almoco','lanche','jantar','ceia')),
  photo_path text check (photo_path is null or photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),
  source text not null default 'manual' check (source in ('manual','foto_ia','receita')),
  total_kcal numeric(7,1) not null default 0 check (total_kcal between 0 and 20000),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  food_entry_id uuid not null references public.food_entries(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  category text check (char_length(category) <= 40),
  quantity numeric(8,2) not null check (quantity >= 0),
  unit text not null check (unit in ('g','ml','unidade')),
  grams numeric(8,2) not null check (grams > 0 and grams <= 5000),
  kcal numeric(7,1) not null check (kcal between 0 and 10000),
  protein_g numeric(7,2) not null check (protein_g between 0 and 1000),
  carbs_g numeric(7,2) not null check (carbs_g between 0 and 1000),
  fat_g numeric(7,2) not null check (fat_g between 0 and 1000),
  fiber_g numeric(7,2) check (fiber_g is null or fiber_g between 0 and 500),
  nutrition_source text not null check (char_length(nutrition_source) <= 120),
  source_consulted_at text,
  confidence text not null check (confidence in ('alta','media','baixa','informado')),
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Movimento, sono, água, bem-estar
-- ---------------------------------------------------------------------
create table public.activity_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_type text not null check (char_length(activity_type) <= 40),
  custom_name text check (char_length(custom_name) <= 60),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  intensity text not null check (intensity in ('leve','moderada','vigorosa')),
  perceived_effort smallint check (perceived_effort between 1 and 10),
  met numeric(4,1) not null check (met between 1 and 23),
  kcal_estimated numeric(7,1) not null default 0 check (kcal_estimated >= 0),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_time check (ended_at > started_at and ended_at - started_at <= interval '12 hours')
);

create table public.sleep_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  awake_minutes integer not null default 0 check (awake_minutes >= 0),
  awakenings smallint check (awakenings between 0 and 50),
  quality smallint check (quality between 1 and 5),
  hunger_level smallint check (hunger_level between 1 and 5),
  energy_level smallint check (energy_level between 1 and 5),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sleep_time check (ended_at > started_at and ended_at - started_at <= interval '20 hours'),
  constraint sleep_awake check (awake_minutes * interval '1 minute' <= ended_at - started_at)
);

create table public.hydration_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  drank_at timestamptz not null,
  volume_ml integer not null check (volume_ml between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wellbeing_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  logged_at timestamptz not null,
  hunger_level smallint check (hunger_level between 1 and 5),
  energy_level smallint check (energy_level between 1 and 5),
  symptoms text check (char_length(symptoms) <= 500),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Jejum e hábitos
-- ---------------------------------------------------------------------
create table public.fasting_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  protocol_hours smallint not null check (protocol_hours in (12, 14, 16, 18, 20, 24)),
  started_at timestamptz not null,
  expected_end_at timestamptz not null,
  ended_at timestamptz,
  professional_confirmed boolean not null default false,
  professional_24h_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fasting_end check (ended_at is null or ended_at >= started_at)
);
create unique index fasting_one_active on public.fasting_sessions(user_id) where ended_at is null;

create table public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  habit_key text not null check (char_length(habit_key) <= 40),
  status text not null check (status in ('feito','parcial','nao')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date, habit_key)
);

-- ---------------------------------------------------------------------
-- Receitas
-- ---------------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  servings smallint not null check (servings between 1 and 100),
  allergens text check (char_length(allergens) <= 200),
  substitutions text check (char_length(substitutions) <= 500),
  notes text check (char_length(notes) <= 500),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  grams numeric(8,2) not null check (grams > 0 and grams <= 10000),
  kcal numeric(8,1) not null check (kcal >= 0),
  protein_g numeric(7,2) not null check (protein_g >= 0),
  carbs_g numeric(7,2) not null check (carbs_g >= 0),
  fat_g numeric(7,2) not null check (fat_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Índices (consultas por usuário e período) e gatilhos de updated_at
-- ---------------------------------------------------------------------
create index on public.health_screenings (user_id, created_at desc);
create index on public.consents (user_id, created_at desc);
create index on public.goals (user_id, created_at desc);
create index on public.weight_entries (user_id, measured_at desc);
create index on public.food_entries (user_id, eaten_at desc);
create index on public.food_items (food_entry_id);
create index on public.food_items (user_id);
create index on public.activity_entries (user_id, started_at desc);
create index on public.sleep_entries (user_id, ended_at desc);
create index on public.hydration_entries (user_id, drank_at desc);
create index on public.wellbeing_entries (user_id, logged_at desc);
create index on public.fasting_sessions (user_id, started_at desc);
create index on public.habit_checkins (user_id, date desc);
create index on public.recipes (user_id, created_at desc);
create index on public.recipe_items (recipe_id);

do $$
declare t text;
begin
  foreach t in array array['profiles','user_preferences','health_screenings','consents','goals','weight_entries',
    'food_entries','food_items','activity_entries','sleep_entries','hydration_entries','wellbeing_entries',
    'fasting_sessions','habit_checkins','recipes','recipe_items']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
