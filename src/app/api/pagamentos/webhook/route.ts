import { NextResponse } from "next/server";
import { adminClient } from "@/lib/server/admin";
import {
  getAuthorizedPayment,
  getPayment,
  getPreapproval,
  mpConfigured,
  parseExternalRef,
  verifyWebhookSignature,
} from "@/lib/server/mercadopago";
import { extendPeriod, PLANS } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRACE_MS = 3 * 86_400_000;

/**
 * Notificações do Mercado Pago. Nunca confia no corpo: valida a assinatura HMAC e
 * busca o recurso direto na API do Mercado Pago antes de liberar qualquer plano.
 */
export async function POST(req: Request) {
  if (!mpConfigured()) return NextResponse.json({ error: "não configurado" }, { status: 503 });
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as {
    type?: string;
    data?: { id?: string | number };
  };
  const dataId =
    url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);
  const type = url.searchParams.get("type") ?? body.type ?? null;

  const valid = verifyWebhookSignature({
    signature: req.headers.get("x-signature"),
    requestId: req.headers.get("x-request-id"),
    dataId,
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET!,
  });
  if (!valid || !dataId)
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });

  const admin = adminClient();
  try {
    if (type === "payment") {
      const p = await getPayment(dataId);
      const ref = parseExternalRef(p.external_reference);
      if (!ref) return NextResponse.json({ ok: true, ignored: true });
      const price = PLANS[ref.plan].prices![ref.period];
      const { data: prev } = await admin
        .from("payments")
        .select("status")
        .eq("provider_payment_id", String(p.id))
        .maybeSingle();
      await admin
        .from("payments")
        .upsert(
          {
            user_id: ref.userId,
            provider_payment_id: String(p.id),
            plan: ref.plan,
            period: ref.period,
            amount: p.transaction_amount,
            status: p.status,
          },
          { onConflict: "provider_payment_id" },
        );
      const { data: sub } = await admin
        .from("subscriptions")
        .select("current_period_end")
        .eq("user_id", ref.userId)
        .maybeSingle();
      if (
        p.status === "approved" &&
        prev?.status !== "approved" &&
        p.transaction_amount + 0.01 >= price
      ) {
        await admin.from("subscriptions").upsert(
          {
            user_id: ref.userId,
            plan: ref.plan,
            period: ref.period,
            status: "active",
            trial_used: true,
            current_period_end: extendPeriod(
              (sub?.current_period_end as string | null) ?? null,
              ref.period,
            ),
            provider: "mercadopago",
            provider_ref: String(p.id),
          },
          { onConflict: "user_id" },
        );
      }
      if (p.status === "refunded" || p.status === "charged_back") {
        await admin
          .from("subscriptions")
          .update({ status: "expired" })
          .eq("user_id", ref.userId)
          .eq("provider_ref", String(p.id));
      }
    } else if (type === "subscription_preapproval" || type === "subscription_authorized_payment") {
      let preapprovalId = dataId;
      if (type === "subscription_authorized_payment") {
        const ap = await getAuthorizedPayment(dataId);
        preapprovalId = ap.preapproval_id;
        const pa0 = await getPreapproval(preapprovalId);
        const ref0 = parseExternalRef(pa0.external_reference);
        if (ref0)
          await admin
            .from("payments")
            .upsert(
              {
                user_id: ref0.userId,
                provider_payment_id: `ap_${ap.id}`,
                plan: ref0.plan,
                period: "mensal",
                amount: ap.transaction_amount,
                status: ap.status,
              },
              { onConflict: "provider_payment_id" },
            );
      }
      const pa = await getPreapproval(preapprovalId);
      const ref = parseExternalRef(pa.external_reference);
      if (!ref) return NextResponse.json({ ok: true, ignored: true });
      const next = pa.next_payment_date
        ? new Date(Date.parse(pa.next_payment_date) + GRACE_MS).toISOString()
        : extendPeriod(null, "mensal");
      const status =
        pa.status === "authorized"
          ? "active"
          : pa.status === "cancelled"
            ? "canceled"
            : pa.status === "paused"
              ? "past_due"
              : null;
      if (status) {
        const { data: sub } = await admin
          .from("subscriptions")
          .select("current_period_end")
          .eq("user_id", ref.userId)
          .maybeSingle();
        await admin.from("subscriptions").upsert(
          {
            user_id: ref.userId,
            plan: ref.plan,
            period: "mensal",
            status,
            trial_used: true,
            current_period_end:
              status === "active" ? next : ((sub?.current_period_end as string | null) ?? null),
            provider: "mercadopago",
            provider_ref: pa.id,
          },
          { onConflict: "user_id" },
        );
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook] falha", {
      type,
      reason: e instanceof Error ? e.message.slice(0, 30) : "?",
    });
    return NextResponse.json({ error: "erro temporário" }, { status: 500 }); // Mercado Pago tenta de novo
  }
}
