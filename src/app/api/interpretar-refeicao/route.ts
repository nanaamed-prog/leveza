import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, rateLimit } from "@/lib/server/auth";
import { analyzeMealText, visionConfigured } from "@/lib/server/vision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ texto: z.string().trim().min(2).max(1500) });

/** Interpreta a descrição da refeição com IA (opcional). Sem IA, o app usa o interpretador local. */
export async function POST(req: Request) {
  if (!visionConfigured())
    return NextResponse.json({ error: "IA não configurada." }, { status: 503 });
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!rateLimit(`text:${auth.userId}`, 20, 60_000)) {
    return NextResponse.json({ error: "Muitas solicitações. Aguarde um minuto." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Descreva a refeição em até 1.500 caracteres." },
      { status: 400 },
    );
  try {
    const r = await analyzeMealText(parsed.data.texto);
    return NextResponse.json(
      {
        items: r.itens.map((i) => ({
          name: i.nome,
          grams: i.gramas_estimadas,
          preparation: i.preparo ?? null,
          confidence: i.confianca,
        })),
        note: r.observacao ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[interpretar-refeicao] falha", {
      reason: e instanceof Error ? e.message.slice(0, 40) : "desconhecido",
    });
    return NextResponse.json({ error: "Não foi possível interpretar agora." }, { status: 502 });
  }
}
