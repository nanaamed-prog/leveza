-- =====================================================================
-- LEVEZA — Assinaturas (Mercado Pago)
-- O usuário só LÊ a própria assinatura. Quem escreve é o servidor (webhook, service role)
-- ou a função start_trial() — assim ninguém consegue se dar um plano pago pelo app.
-- =====================================================================

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('gratis','plus','plus_ia')),
  period text check (period in ('mensal','anual')),
  status text not null check (status in ('trial','active','past_due','canceled','expired')),
  trial_ends_at timestamptz,
  trial_used boolean not null default false,
  current_period_end timestamptz,
  provider text check (provider in ('mercadopago')),
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_payment_id text not null unique,
  plan text not null,
  period text not null,
  amount numeric(10,2) not null,
  status text not null,
  created_at timestamptz not null default now()
);
create index on public.payments (user_id, created_at desc);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('foto','texto')),
  created_at timestamptz not null default now()
);
create index on public.ai_usage (user_id, created_at desc);

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;
create policy subscriptions_select_own on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));

alter table public.payments enable row level security;
alter table public.payments force row level security;
create policy payments_select_own on public.payments for select to authenticated using (user_id = (select auth.uid()));

alter table public.ai_usage enable row level security;
alter table public.ai_usage force row level security;
create policy ai_usage_select_own on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));
create policy ai_usage_insert_own on public.ai_usage for insert to authenticated with check (user_id = (select auth.uid()));

revoke all on public.subscriptions, public.payments, public.ai_usage from anon;
revoke insert, update, delete on public.subscriptions, public.payments from authenticated;
grant select on public.subscriptions, public.payments to authenticated;
grant select, insert on public.ai_usage to authenticated;

-- Teste grátis de 7 dias do Plus: uma única vez por conta.
create or replace function public.start_trial() returns public.subscriptions
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.subscriptions;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into s from public.subscriptions where user_id = uid;
  if found then
    if s.trial_used or s.status in ('active','past_due') then
      raise exception 'trial_unavailable: o teste grátis já foi usado nesta conta' using errcode = 'P0001';
    end if;
    update public.subscriptions
      set plan = 'plus', status = 'trial', trial_used = true, trial_ends_at = now() + interval '7 days'
      where user_id = uid returning * into s;
  else
    insert into public.subscriptions (user_id, plan, status, trial_used, trial_ends_at)
      values (uid, 'plus', 'trial', true, now() + interval '7 days') returning * into s;
  end if;
  return s;
end $$;
revoke all on function public.start_trial() from public, anon;
grant execute on function public.start_trial() to authenticated;
