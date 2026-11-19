-- =====================================================================
-- LEVEZA — Row Level Security
-- Regra geral: cada pessoa só vê e altera as próprias linhas.
-- (select auth.uid()) é avaliado uma vez por consulta (recomendação Supabase).
-- =====================================================================

do $$
declare t text;
begin
  -- Tabelas com CRUD completo pelo próprio usuário
  foreach t in array array['profiles','user_preferences','goals','weight_entries','food_entries','activity_entries',
    'sleep_entries','hydration_entries','wellbeing_entries','fasting_sessions','habit_checkins','recipes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete_own', t);
  end loop;

  -- Histórico append-only: triagem e consentimentos (sem update/delete pelo cliente;
  -- são apagados em cascata quando a conta é excluída)
  foreach t in array array['health_screenings','consents']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert_own', t);
  end loop;
end $$;

-- Itens filhos: além de user_id, o registro-pai precisa pertencer ao mesmo usuário
alter table public.food_items enable row level security;
alter table public.food_items force row level security;
create policy food_items_select_own on public.food_items for select to authenticated using (user_id = (select auth.uid()));
create policy food_items_insert_own on public.food_items for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.food_entries e where e.id = food_entry_id and e.user_id = (select auth.uid())));
create policy food_items_update_own on public.food_items for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.food_entries e where e.id = food_entry_id and e.user_id = (select auth.uid())));
create policy food_items_delete_own on public.food_items for delete to authenticated using (user_id = (select auth.uid()));

alter table public.recipe_items enable row level security;
alter table public.recipe_items force row level security;
create policy recipe_items_select_own on public.recipe_items for select to authenticated using (user_id = (select auth.uid()));
create policy recipe_items_insert_own on public.recipe_items for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())));
create policy recipe_items_update_own on public.recipe_items for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())));
create policy recipe_items_delete_own on public.recipe_items for delete to authenticated using (user_id = (select auth.uid()));

-- Visitantes anônimos não acessam nada
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
