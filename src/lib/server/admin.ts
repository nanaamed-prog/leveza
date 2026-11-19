import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Cliente com service role — SOMENTE no servidor, para escrever assinaturas e pagamentos. */
export function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Cliente agindo como o usuário (RLS aplicada), a partir do token Bearer. */
export function userClient(token: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
}
