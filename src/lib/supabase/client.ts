"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true quando o Supabase está configurado; caso contrário o app roda em Modo demonstração. */
export const isSupabaseConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        // Evita travamento do bloqueio de sessão (navigator.locks) quando o celular
        // retoma o app instalado depois de um tempo em segundo plano.
        lock: async (_name, _acquireTimeout, fn) => fn(),
      },
    });
  }
  return client;
}
