import "server-only";
import { userClient } from "./admin";
import { effectivePlan, hasFeature, PLANS, type Feature, type SubscriptionLike } from "@/lib/plans";

/** Confere no servidor se o usuário tem o recurso e, para IA, se ainda há cota no mês. */
export async function checkFeature(
  token: string | null,
  userId: string,
  feature: Feature,
  usageKind?: "foto" | "texto",
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!token || userId === "demo") return { ok: true }; // modo de teste local explícito
  const sb = userClient(token);
  const { data: sub } = await sb
    .from("subscriptions")
    .select("plan,status,current_period_end,trial_ends_at")
    .maybeSingle();
  const eff = effectivePlan((sub as SubscriptionLike | null) ?? null);
  if (!hasFeature(eff.plan, feature)) {
    return {
      ok: false,
      error: "Recurso do plano Leveza Plus IA. Veja os planos em Perfil → Meu plano.",
      status: 402,
    };
  }
  if (usageKind) {
    const since = new Date();
    since.setUTCDate(1);
    since.setUTCHours(0, 0, 0, 0);
    const { count } = await sb
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString());
    if ((count ?? 0) >= PLANS[eff.plan].aiMonthlyLimit) {
      return {
        ok: false,
        error: `Você usou as ${PLANS[eff.plan].aiMonthlyLimit} análises de IA deste mês. O registro manual continua disponível.`,
        status: 429,
      };
    }
    await sb.from("ai_usage").insert({ user_id: userId, kind: usageKind });
  }
  return { ok: true };
}
