import { NextResponse } from "next/server";
import { requireUser, rateLimit } from "@/lib/server/auth";
import { analyzeMealImage, sniffImageType, visionConfigured } from "@/lib/server/vision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 5 * 1024 * 1024;

export async function GET() {
  return NextResponse.json(
    { configured: visionConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  if (!visionConfigured()) {
    return NextResponse.json(
      { error: "Análise por foto não configurada. Use o registro manual." },
      { status: 503 },
    );
  }
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!rateLimit(`vision:${auth.userId}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Muitas análises em pouco tempo. Aguarde um minuto." },
      { status: 429 },
    );
  }

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES + 64_000)
    return NextResponse.json({ error: "Imagem muito grande (máx. 5 MB)." }, { status: 413 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("foto");
    file = f instanceof File ? f : null;
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "Nenhuma foto recebida." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "Imagem muito grande (máx. 5 MB)." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type)
    return NextResponse.json(
      { error: "Arquivo não é uma imagem JPG, PNG ou WEBP válida." },
      { status: 415 },
    );

  try {
    const result = await analyzeMealImage(bytes, type);
    return NextResponse.json(
      {
        items: result.itens.map((i) => ({
          name: i.nome,
          grams: i.gramas_estimadas,
          preparation: i.preparo ?? null,
          confidence: i.confianca,
        })),
        note: result.observacao ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    // Log sem dados sensíveis (sem imagem, sem conteúdo da resposta).
    console.error("[analisar-prato] falha", {
      reason: e instanceof Error ? e.message.slice(0, 40) : "desconhecido",
    });
    return NextResponse.json(
      { error: "Não foi possível analisar agora. Você pode registrar manualmente." },
      { status: 502 },
    );
  }
}
