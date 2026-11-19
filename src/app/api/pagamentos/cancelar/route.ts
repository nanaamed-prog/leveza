import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { adminClient } from "@/lib/server/admin";
import { cancelPreapproval, mpConfigured } from "@/lib/server/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cancela a renovação mensal. O plano continua até o fim do período já pago. */
export async function POST(req: Request) {
  if (!mpConfigured())
    return NextResponse.json({ error: "Pagamentos ainda não configurados." }, { status: 503 });
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = adminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("period, provider_ref, status")
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!sub || sub.status !== "active")
    return NextResponse.json({ error: "Nenhuma assinatura ativa." }, { status: 400 });
  try {
    if (sub.period === "mensal" && sub.provider_ref)
      await cancelPreapproval(sub.provider_ref as string);
    await admin.from("subscriptions").update({ status: "canceled" }).eq("user_id", auth.userId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível cancelar agora. Tente de novo." },
      { status: 502 },
    );
  }
}
