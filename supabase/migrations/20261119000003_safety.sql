-- =====================================================================
-- LEVEZA — Regras de segurança aplicadas também no banco
-- (o cliente valida, mas o servidor é a fonte de verdade)
-- =====================================================================

-- Avaliação de elegibilidade a partir da triagem MAIS RECENTE.
-- Ausência de triagem ou de qualquer resposta = não elegível.
create or replace function public.screening_flags(p_user uuid)
returns table (adult boolean, can_fast boolean, can_lose_weight boolean)
language sql stable security definer set search_path = public as $$
  with s as (
    select * from public.health_screenings
    where user_id = p_user
    order by created_at desc
    limit 1
  ),
  base as (
    select
      coalesce(s.birth_date is not null and s.birth_date <= (current_date - interval '18 years')::date, false) as adult,
      coalesce(s.consent_health_data, false) as consent,
      coalesce(s.pregnant = 'sim', false) as pregnant,
      coalesce(s.breastfeeding = 'sim', false) as breastfeeding,
      s.pregnant is not null and s.breastfeeding is not null as answered_pb,
      coalesce(s.eating_disorder = 'nao', false) as no_ed,
      coalesce(s.diabetes = 'nao' and s.hypoglycemia_meds = 'nao', false) as no_hypo,
      coalesce(s.clinical_conditions = array['nenhuma']::text[], false) as no_conditions
    from (select 1) one left join s on true
  )
  select
    adult,
    adult and consent and answered_pb and not pregnant and not breastfeeding and no_ed and no_hypo and no_conditions,
    adult and consent and answered_pb and not pregnant and not breastfeeding and no_ed
  from base;
$$;
revoke all on function public.screening_flags(uuid) from public, anon;

-- Jejum: bloqueia início sem elegibilidade; 18/20 h exigem confirmação profissional; 24 h exige confirmação específica.
create or replace function public.enforce_fasting_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare f record;
begin
  select * into f from public.screening_flags(new.user_id);
  if not coalesce(f.can_fast, false) then
    raise exception 'fasting_not_allowed: triagem não permite jejum programado' using errcode = 'P0001';
  end if;
  if new.protocol_hours >= 18 and not new.professional_confirmed then
    raise exception 'fasting_not_allowed: protocolo exige confirmação de acompanhamento profissional' using errcode = 'P0001';
  end if;
  if new.protocol_hours = 24 and not new.professional_24h_confirmed then
    raise exception 'fasting_not_allowed: 24 h exige orientação profissional específica' using errcode = 'P0001';
  end if;
  if new.expected_end_at <> new.started_at + make_interval(hours => new.protocol_hours) then
    new.expected_end_at := new.started_at + make_interval(hours => new.protocol_hours);
  end if;
  return new;
end $$;

create trigger fasting_rules before insert on public.fasting_sessions
  for each row execute function public.enforce_fasting_rules();

-- Impede alterar protocolo/início de uma sessão existente (só encerramento é permitido)
create or replace function public.fasting_update_guard() returns trigger
language plpgsql as $$
begin
  if new.protocol_hours <> old.protocol_hours or new.started_at <> old.started_at
     or new.professional_confirmed <> old.professional_confirmed
     or new.professional_24h_confirmed <> old.professional_24h_confirmed then
    raise exception 'fasting_not_allowed: apenas o encerramento pode ser alterado' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger fasting_update_guard before update on public.fasting_sessions
  for each row execute function public.fasting_update_guard();

-- Metas: perda de peso bloqueada para quem a triagem não permite
create or replace function public.enforce_goal_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare f record;
begin
  if new.type = 'perder' and new.status = 'ativa' then
    select * into f from public.screening_flags(new.user_id);
    if not coalesce(f.can_lose_weight, false) then
      raise exception 'goal_not_allowed: meta de perda de peso indisponível para este perfil' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger goal_rules before insert or update on public.goals
  for each row execute function public.enforce_goal_rules();

-- Ao registrar nova triagem que não permite mais jejum, encerra jejum ativo
create or replace function public.close_fasting_if_ineligible() returns trigger
language plpgsql security definer set search_path = public as $$
declare f record;
begin
  select * into f from public.screening_flags(new.user_id);
  if not coalesce(f.can_fast, false) then
    update public.fasting_sessions set ended_at = now() where user_id = new.user_id and ended_at is null;
  end if;
  return new;
end $$;
create trigger screening_close_fasting after insert on public.health_screenings
  for each row execute function public.close_fasting_if_ineligible();
