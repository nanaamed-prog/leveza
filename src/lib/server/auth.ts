import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Valida o token Bearer enviado pelo cliente e retorna o id do usuário. */
export async function requireUser(
  req: Request,
): Promise<{ userId: string } | { error: string; status: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Sem Supabase: só permite se explicitamente liberado para testes locais.
    if (process.env.ALLOW_DEMO_AI === "true") return { userId: "demo" };
    return {
      error: "Conta não configurada. Configure o Supabase para usar esta função.",
      status: 503,
    };
  }
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { error: "Faça login para continuar.", status: 401 };
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { error: "Sessão inválida. Entre novamente.", status: 401 };
  return { userId: data.user.id };
}

const hits = new Map<string, number[]>();
/** Limite simples por instância (em produção, use um limitador compartilhado, ex.: Upstash/Redis). */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  hits.set(key, arr);
  return true;
}
