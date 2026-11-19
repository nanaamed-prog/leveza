import "server-only";
import { z } from "zod";

/** Adaptador de IA visual. A chave fica SOMENTE no servidor (variáveis de ambiente). */

export const AnalysisSchema = z.object({
  itens: z
    .array(
      z.object({
        nome: z.string().min(1).max(80),
        gramas_estimadas: z.number().positive().max(3000),
        preparo: z.string().max(60).nullable().optional(),
        confianca: z.enum(["alta", "media", "baixa"]),
      }),
    )
    .max(20),
  observacao: z.string().max(400).nullable().optional(),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

const PROMPT = `Você analisa fotos de refeições para um diário alimentar brasileiro.
Identifique os alimentos visíveis e estime a porção de cada um em gramas (ou ml para bebidas).
Responda SOMENTE com JSON válido, sem texto extra, no formato:
{"itens":[{"nome":"arroz branco cozido","gramas_estimadas":120,"preparo":"cozido","confianca":"media"}],"observacao":"..."}
Regras:
- Use nomes simples em português do Brasil (ex.: "feijão carioca cozido", "peito de frango grelhado", "alface").
- "confianca": "alta", "media" ou "baixa". Seja conservador: porções por foto são aproximadas.
- Liste óleo, molhos ou açúcar apenas se forem claramente visíveis.
- Se não houver comida na imagem, retorne {"itens":[],"observacao":"Não identifiquei alimentos."}.
- Não faça comentários sobre saúde, dieta ou peso.`;

export function visionConfigured(): boolean {
  return Boolean(process.env.AI_VISION_API_KEY && process.env.AI_VISION_PROVIDER);
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Resposta da IA sem JSON.");
  return JSON.parse(text.slice(start, end + 1));
}

export async function analyzeMealImage(bytes: Uint8Array, mediaType: string): Promise<Analysis> {
  const provider = process.env.AI_VISION_PROVIDER;
  const key = process.env.AI_VISION_API_KEY!;
  const b64 = Buffer.from(bytes).toString("base64");
  const signal = AbortSignal.timeout(45_000);
  let text: string;

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.AI_VISION_MODEL || "claude-sonnet-5-5",
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`provider_${res.status}`);
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    text = json.content?.find((c) => c.type === "text")?.text ?? "";
  } else if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.AI_VISION_MODEL || "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${b64}` } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`provider_${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    text = json.choices?.[0]?.message?.content ?? "";
  } else {
    throw new Error("provider_unknown");
  }
  return AnalysisSchema.parse(extractJson(text));
}

/** Confere o tipo real do arquivo pelos "magic bytes" (não confia no nome/extensão). */
export function sniffImageType(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return "image/png";
  if (
    b.length > 12 &&
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
