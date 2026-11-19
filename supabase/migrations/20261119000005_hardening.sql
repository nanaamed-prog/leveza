-- LEVEZA — endurecimento recomendado pelo Security Advisor do Supabase
alter function public.set_updated_at() set search_path = '';
alter function public.fasting_update_guard() set search_path = '';
revoke all on function public.screening_flags(uuid) from public, anon, authenticated;
revoke execute on function public.enforce_fasting_rules() from public, anon, authenticated;
revoke execute on function public.enforce_goal_rules() from public, anon, authenticated;
revoke execute on function public.close_fasting_if_ineligible() from public, anon, authenticated;
