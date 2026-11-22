import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Verificação de saúde: o app consegue falar com o banco? Não expõe chaves nem dados. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ banco: "nao_configurado" });
  const started = Date.now();
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anon },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const rest = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anon },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return NextResponse.json({
      banco: res.ok && rest.status < 500 ? "ok" : "com_problema",
      auth: res.status,
      rest: rest.status,
      ms: Date.now() - started,
    });
  } catch (e) {
    return NextResponse.json({
      banco: "sem_resposta",
      erro: e instanceof Error ? e.name : "desconhecido",
      ms: Date.now() - started,
    });
  }
}
