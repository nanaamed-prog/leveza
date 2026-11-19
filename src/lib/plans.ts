/**
 * Planos do Leveza. Preços e limites vivem SÓ aqui e são lidos pelo servidor ao criar cobranças
 * (o cliente nunca define valor). Recursos de segurança (triagem, Modo Lactante, avisos) são
 * sempre gratuitos.
 */

export type PlanId = "gratis" | "plus" | "plus_ia";
export type Period = "mensal" | "anual";

export type Feature =
  | "saldo_acumulado" // saldo acumulado e peso estimado
  | "relatorios_longos" // 30/90 dias
  | "exportacao" // CSV
  | "jejum_historico"
  | "receitas_ilimitadas"
  | "ia_foto"
  | "ia_texto";

export interface PlanDef {
  id: PlanId;
  name: string;
  tagline: string;
  prices: Record<Period, number> | null; // BRL
  features: Feature[];
  highlights: string[];
  aiMonthlyLimit: number;
}

export const FREE_RECIPE_LIMIT = 3;
export const TRIAL_DAYS = 7;

export const PLANS: Record<PlanId, PlanDef> = {
  gratis: {
    id: "gratis",
    name: "Leveza Grátis",
    tagline: "O essencial para cuidar do seu dia",
    prices: null,
    features: [],
    aiMonthlyLimit: 0,
    highlights: [
      "Registro de refeições (busca, texto e voz)",
      "Água, sono, intestino e peso",
      "Balanço do dia e meta de calorias",
      "Triagem de segurança e Modo Lactante",
      `Até ${FREE_RECIPE_LIMIT} receitas`,
    ],
  },
  plus: {
    id: "plus",
    name: "Leveza Plus",
    tagline: "Acompanhe sua evolução de verdade",
    prices: { mensal: 19.9, anual: 149.9 },
    features: [
      "saldo_acumulado",
      "relatorios_longos",
      "exportacao",
      "jejum_historico",
      "receitas_ilimitadas",
    ],
    aiMonthlyLimit: 0,
    highlights: [
      "Tudo do Grátis",
      "Saldo acumulado e peso estimado (semana e mês)",
      "Relatórios de 30 e 90 dias e exportação",
      "Histórico de jejum e receitas ilimitadas",
    ],
  },
  plus_ia: {
    id: "plus_ia",
    name: "Leveza Plus IA",
    tagline: "Registre por foto, com inteligência artificial",
    prices: { mensal: 34.9, anual: 279 },
    features: [
      "saldo_acumulado",
      "relatorios_longos",
      "exportacao",
      "jejum_historico",
      "receitas_ilimitadas",
      "ia_foto",
      "ia_texto",
    ],
    aiMonthlyLimit: 90,
    highlights: [
      "Tudo do Plus",
      "Foto do prato analisada por IA",
      "IA para interpretar o que você descreve",
      "Até 90 análises por mês",
    ],
  },
};

export interface SubscriptionLike {
  plan: PlanId;
  status: "trial" | "active" | "past_due" | "canceled" | "expired";
  current_period_end: string | null;
  trial_ends_at: string | null;
}

export interface Effective {
  plan: PlanId;
  isTrial: boolean;
  /** Dias restantes do teste ou do período pago. */
  daysLeft: number | null;
  canceledAtPeriodEnd: boolean;
}

/** Plano efetivo agora. Cancelado continua valendo até o fim do período já pago. */
export function effectivePlan(sub: SubscriptionLike | null, now: number = Date.now()): Effective {
  if (!sub) return { plan: "gratis", isTrial: false, daysLeft: null, canceledAtPeriodEnd: false };
  const days = (iso: string | null) =>
    iso ? Math.ceil((Date.parse(iso) - now) / 86_400_000) : null;
  if (sub.status === "trial") {
    const left = days(sub.trial_ends_at);
    return left !== null && left > 0
      ? { plan: sub.plan, isTrial: true, daysLeft: left, canceledAtPeriodEnd: false }
      : { plan: "gratis", isTrial: false, daysLeft: null, canceledAtPeriodEnd: false };
  }
  if (sub.status === "active" || sub.status === "past_due" || sub.status === "canceled") {
    const left = days(sub.current_period_end);
    if (left !== null && left > 0)
      return {
        plan: sub.plan,
        isTrial: false,
        daysLeft: left,
        canceledAtPeriodEnd: sub.status === "canceled",
      };
  }
  return { plan: "gratis", isTrial: false, daysLeft: null, canceledAtPeriodEnd: false };
}

export function hasFeature(plan: PlanId, f: Feature): boolean {
  return PLANS[plan].features.includes(f);
}

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Estende o período a partir do fim atual (se ainda válido) ou de agora. */
export function extendPeriod(
  currentEnd: string | null,
  period: Period,
  now: number = Date.now(),
): string {
  const base = new Date(Math.max(now, currentEnd ? Date.parse(currentEnd) : 0));
  if (period === "anual") base.setUTCFullYear(base.getUTCFullYear() + 1);
  else base.setUTCMonth(base.getUTCMonth() + 1);
  return base.toISOString();
}
