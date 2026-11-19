import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exclui a conta: remove fotos do Storage e o usuário (tabelas apagam em cascata). */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service || auth.userId === "demo") {
    return NextResponse.json(
      { error: "Exclusão indisponível: servidor sem chave de serviço configurada." },
      { status: 503 },
    );
  }
  const admin = createClient(url, service, { auth: { persistSession: false } });

  // 1) Fotos
  for (let page = 0; page < 50; page++) {
    const { data, error } = await admin.storage
      .from("food-photos")
      .list(auth.userId, { limit: 100 });
    if (error || !data || data.length === 0) break;
    await admin.storage.from("food-photos").remove(data.map((o) => `${auth.userId}/${o.name}`));
  }
  // 2) Usuário (ON DELETE CASCADE apaga os dados)
  const { error } = await admin.auth.admin.deleteUser(auth.userId);
  if (error) {
    console.error("[conta/excluir] falha ao excluir usuário");
    return NextResponse.json(
      { error: "Não foi possível excluir agora. Tente novamente." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
