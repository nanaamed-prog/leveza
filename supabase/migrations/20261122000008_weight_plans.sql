-- =====================================================================
-- LEVEZA — Plano Inteligente de Emagrecimento
-- Planos salvos (um ativo por pessoa) + padrão de amamentação no perfil.
-- O banco também bloqueia: plano só para quem a triagem permite perda de peso
-- (lactantes, gestantes, menores e histórico de transtorno alimentar ficam de fora)
-- e ingestão nunca abaixo de 1.200 kcal.
-- =====================================================================

alter table public.profiles
  add column if not exists breastfeeding_pattern text
  check (breastfeeding_pattern in ('exclusiva','parcial','nao_informado'));

create table public.weight_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  start_weight_kg numeric(5,1) not null check (start_weight_kg between 25 and 400),
  target_weight_kg numeric(5,1) not null check (target_weight_kg between 25 and 400),
  intake_kcal integer not null check (intake_kcal between 1200 and 6000),
  exercise_days smallint not null check (exercise_days between 0 and 7),
  exercise_minutes smallint not null check (exercise_minutes between 0 and 240),
  exercise_intensity text not null check (exercise_intensity in ('leve','moderada','intensa')),
  scenario text not null check (scenario in ('leve','moderada','intensa','personalizado')),
  eta_weeks_min smallint check (eta_weeks_min between 0 and 156),
  eta_weeks_max smallint check (eta_weeks_max between 0 and 156),
  status text not null default 'ativo' check (status in ('ativo','pausado','manutencao','encerrado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_rest check (not (exercise_intensity = 'intensa' and exercise_days > 5)),
  constraint plan_volume check (exercise_days * exercise_minutes <= 600)
);
create unique index weight_plans_one_open on public.weight_plans(user_id) where status in ('ativo','pausado','manutencao');
create index on public.weight_plans (user_id, created_at desc);
create trigger set_updated_at before update on public.weight_plans for each row execute function public.set_updated_at();

create or replace function public.enforce_weight_plan_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare f record;
begin
  if new.status = 'ativo' then
    select * into f from public.screening_flags(new.user_id);
    if not coalesce(f.can_lose_weight, false) then
      raise exception 'plan_not_allowed: plano de emagrecimento indisponível para este perfil' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.enforce_weight_plan_rules() from public, anon, authenticated;
create trigger weight_plan_rules before insert or update on public.weight_plans
  for each row execute function public.enforce_weight_plan_rules();

alter table public.weight_plans enable row level security;
alter table public.weight_plans force row level security;
create policy weight_plans_select_own on public.weight_plans for select to authenticated using (user_id = (select auth.uid()));
create policy weight_plans_insert_own on public.weight_plans for insert to authenticated with check (user_id = (select auth.uid()));
create policy weight_plans_update_own on public.weight_plans for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy weight_plans_delete_own on public.weight_plans for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.weight_plans from anon;
grant select, insert, update, delete on public.weight_plans to authenticated;
