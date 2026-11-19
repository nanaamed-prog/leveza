import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PLANS, type Period, type PlanId } from "@/lib/plans";

/** Integração Mercado Pago (API REST). Token só no servidor. */
const API = "https://api.mercadopago.com";

export function mpConfigured(): boolean {
  return Boolean(
    process.env.MERCADOPAGO_ACCESS_TOKEN &&
    process.env.MERCADOPAGO_WEBHOOK_SECRET &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://leveza-one.vercel.app").replace(/\/$/, "");
}

async function mp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    signal: AbortSignal.timeout(20_000),
    headers: {
      authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "content-type": "application/json",
      ...(init.method && init.method !== "GET" ? { "x-idempotency-key": crypto.randomUUID() } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`mp_${res.status}`);
  return (await res.json()) as T;
}

/** Referência externa: liga o pagamento ao usuário e ao plano escolhido. */
export function externalRef(userId: string, plan: PlanId, period: Period): string {
  return `${userId}|${plan}|${period}`;
}

export function parseExternalRef(
  ref: string | null | undefined,
): { userId: string; plan: PlanId; period: Period } | null {
  if (!ref) return null;
  const [userId, plan, period] = ref.split("|");
  if (!userId || !/^[0-9a-f-]{36}$/.test(userId)) return null;
  if (plan !== "plus" && plan !== "plus_ia") return null;
  if (period !== "mensal" && period !== "anual") return null;
  return { userId, plan, period };
}

/** Pagamento único (Pix ou cartão) — usado no plano anual. */
export async function createOneTimeCheckout(p: {
  userId: string;
  email: string;
  plan: PlanId;
  period: Period;
}) {
  const def = PLANS[p.plan];
  const price = def.prices![p.period];
  const pref = await mp<{ id: string; init_point: string }>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          id: `${p.plan}-${p.period}`,
          title: `${def.name} — ${p.period}`,
          quantity: 1,
          unit_price: price,
          currency_id: "BRL",
        },
      ],
      payer: { email: p.email },
      external_reference: externalRef(p.userId, p.plan, p.period),
      back_urls: {
        success: `${appUrl()}/app/planos?status=sucesso`,
        pending: `${appUrl()}/app/planos?status=pendente`,
        failure: `${appUrl()}/app/planos?status=falhou`,
      },
      auto_return: "approved",
      notification_url: `${appUrl()}/api/pagamentos/webhook`,
      statement_descriptor: "LEVEZA",
      payment_methods: { installments: 12 },
    }),
  });
  return pref.init_point;
}

/** Assinatura mensal recorrente no cartão. */
export async function createMonthlySubscription(p: {
  userId: string;
  email: string;
  plan: PlanId;
}) {
  const def = PLANS[p.plan];
  const sub = await mp<{ id: string; init_point: string }>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `${def.name} — mensal`,
      external_reference: externalRef(p.userId, p.plan, "mensal"),
      payer_email: p.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: def.prices!.mensal,
        currency_id: "BRL",
      },
      back_url: `${appUrl()}/app/planos?status=sucesso`,
      status: "pending",
    }),
  });
  return sub.init_point;
}

export interface MpPayment {
  id: number;
  status: string;
  transaction_amount: number;
  external_reference: string | null;
}
export interface MpPreapproval {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  external_reference: string | null;
  next_payment_date: string | null;
  auto_recurring?: { transaction_amount?: number };
}
export interface MpAuthorizedPayment {
  id: number;
  preapproval_id: string;
  status: string;
  transaction_amount: number;
}

export const getPayment = (id: string) => mp<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);
export const getPreapproval = (id: string) =>
  mp<MpPreapproval>(`/preapproval/${encodeURIComponent(id)}`);
export const getAuthorizedPayment = (id: string) =>
  mp<MpAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(id)}`);
export const cancelPreapproval = (id: string) =>
  mp<MpPreapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });

/**
 * Valida a assinatura do webhook (cabeçalho x-signature: "ts=...,v1=...").
 * Manifesto: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 */
export function verifyWebhookSignature(p: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  if (!p.signature || !p.dataId) return false;
  const parts = Object.fromEntries(
    p.signature.split(",").map((kv) => kv.trim().split("=") as [string, string]),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const id = /^[a-z0-9]+$/i.test(p.dataId) ? p.dataId.toLowerCase() : p.dataId;
  let manifest = `id:${id};`;
  if (p.requestId) manifest += `request-id:${p.requestId};`;
  manifest += `ts:${ts};`;
  const expected = createHmac("sha256", p.secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
