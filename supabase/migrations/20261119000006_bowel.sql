-- LEVEZA — Meu intestino: registro das evacuações (escala de Bristol), sem fotos.
create table public.bowel_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  logged_at timestamptz not null,
  bristol smallint check (bristol between 1 and 7),
  effort text check (effort in ('nenhum','algum','muito')),
  discomfort boolean not null default false,
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.bowel_entries (user_id, logged_at desc);
create trigger set_updated_at before update on public.bowel_entries for each row execute function public.set_updated_at();

alter table public.bowel_entries enable row level security;
alter table public.bowel_entries force row level security;
create policy bowel_entries_select_own on public.bowel_entries for select to authenticated using (user_id = (select auth.uid()));
create policy bowel_entries_insert_own on public.bowel_entries for insert to authenticated with check (user_id = (select auth.uid()));
create policy bowel_entries_update_own on public.bowel_entries for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy bowel_entries_delete_own on public.bowel_entries for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.bowel_entries from anon;
grant select, insert, update, delete on public.bowel_entries to authenticated;
