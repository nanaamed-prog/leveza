import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retenção de fotos: apaga fotos com mais de 30 dias de quem escolheu "30 dias".
 * Chamado diariamente pelo Vercel Cron (vercel.json) com Authorization: Bearer CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return NextResponse.json({ error: "não configurado" }, { status: 503 });
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: users } = await admin
    .from("user_preferences")
    .select("user_id")
    .eq("photo_retention", "30_dias");
  let removed = 0;
  for (const u of users ?? []) {
    const { data: entries } = await admin
      .from("food_entries")
      .select("id, photo_path")
      .eq("user_id", u.user_id)
      .not("photo_path", "is", null)
      .lt("created_at", cutoff)
      .limit(500);
    const paths = (entries ?? []).map((e) => e.photo_path as string);
    if (paths.length === 0) continue;
    const { error } = await admin.storage.from("food-photos").remove(paths);
    if (!error) {
      await admin
        .from("food_entries")
        .update({ photo_path: null })
        .in(
          "id",
          (entries ?? []).map((e) => e.id),
        );
      removed += paths.length;
    }
  }
  return NextResponse.json({ ok: true, removed });
}
