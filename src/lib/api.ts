"use client";

import { getSupabase } from "@/lib/supabase/client";

/** Chama uma rota da API enviando o token da sessão (o servidor valida o usuário). */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.auth.getSession();
    if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  return fetch(path, { ...init, headers });
}
