import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, rateLimit } from "@/lib/server/auth";
import {
  createMonthlySubscription,
  createOneTimeCheckout,
  mpConfigured,
} from "@/lib/server/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ plan: z.enum(["plus", "plus_ia"]), period: z.enum(["mensal", "anual"]) });

export async function GET() {
  return NextResponse.json(
    { configured: mpConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Cria o checkout no Mercado Pago. O valor vem SEMPRE da tabela de planos do servidor. */
export async function POST(req: Request) {
  if (!mpConfigured())
    return NextResponse.json({ error: "Pagamentos ainda não configurados." }, { status: 503 });
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.email)
    return NextResponse.json({ error: "Sua conta precisa de um e-mail." }, { status: 400 });
  if (!rateLimit(`checkout:${auth.userId}`, 6, 60_000))
    return NextResponse.json({ error: "Aguarde um instante e tente de novo." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  const { plan, period } = parsed.data;
  try {
    const url =
      period === "anual"
        ? await createOneTimeCheckout({ userId: auth.userId, email: auth.email, plan, period })
        : await createMonthlySubscription({ userId: auth.userId, email: auth.email, plan });
    return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[checkout] falha", {
      reason: e instanceof Error ? e.message.slice(0, 30) : "?",
    });
    return NextResponse.json(
      { error: "Não foi possível abrir o pagamento agora." },
      { status: 502 },
    );
  }
}
