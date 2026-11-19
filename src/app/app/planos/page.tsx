"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHint } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { LoadingSkeleton } from "@/components/leveza/LoadingSkeleton";
import { usePlan } from "@/lib/data/usePlan";
import { useAppData } from "@/lib/data/provider";
import { apiFetch } from "@/lib/api";
import { PLANS, TRIAL_DAYS, formatBRL, type Period, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

const STATUS_MSG: Record<string, { tone: "ok" | "warn" | "error"; text: string }> = {
  sucesso: {
    tone: "ok",
    text: "Pagamento recebido! A liberação pode levar alguns instantes — esta tela atualiza sozinha.",
  },
  pendente: {
    tone: "warn",
    text: "Pagamento pendente. Se foi Pix, a liberação acontece assim que o banco confirmar.",
  },
  falhou: {
    tone: "error",
    text: "O pagamento não foi concluído. Nenhum valor foi cobrado. Você pode tentar de novo.",
  },
};

function PlansInner() {
  const params = useSearchParams();
  const plan = usePlan();
  const { refresh } = useAppData();
  const [period, setPeriod] = useState<Period>("anual");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(
    () => STATUS_MSG[params.get("status") ?? ""] ?? null,
  );
  const [payReady, setPayReady] = useState<boolean | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    apiFetch("/api/pagamentos/checkout", { method: "GET" })
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((j: { configured?: boolean }) => setPayReady(Boolean(j.configured)))
      .catch(() => setPayReady(false));
  }, []);

  // Depois de voltar do Mercado Pago, atualiza algumas vezes até o webhook liberar o plano.
  useEffect(() => {
    if (params.get("status") !== "sucesso" && params.get("status") !== "pendente") return;
    let n = 0;
    const t = setInterval(() => {
      refresh();
      if (++n >= 12) clearInterval(t);
    }, 5000);
    return () => clearInterval(t);
  }, [params, refresh]);

  async function checkout(id: PlanId) {
    setBusy(id);
    setMsg(null);
    try {
      const res = await apiFetch("/api/pagamentos/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: id, period }),
      });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !j.url) throw new Error(j.error ?? "Não foi possível abrir o pagamento.");
      window.location.assign(j.url);
    } catch (e) {
      setMsg({
        tone: "error",
        text: e instanceof Error ? e.message : "Erro ao abrir o pagamento.",
      });
      setBusy(null);
    }
  }

  async function trial() {
    setBusy("trial");
    const err = await plan.startTrial();
    setBusy(null);
    setMsg(
      err
        ? { tone: "error", text: err }
        : { tone: "ok", text: `Pronto! Você tem ${TRIAL_DAYS} dias do Leveza Plus. Aproveite.` },
    );
  }

  async function cancel() {
    const res = await apiFetch("/api/pagamentos/cancelar", { method: "POST" });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg(
      res.ok
        ? { tone: "ok", text: "Renovação cancelada. Seu plano continua até o fim do período pago." }
        : { tone: "error", text: j.error ?? "Não foi possível cancelar." },
    );
    refresh();
  }

  if (plan.loading) return <LoadingSkeleton />;
  const current = PLANS[plan.plan];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Assinatura"
        subtitle="Cuidado e segurança são sempre gratuitos."
        back="/app/perfil"
      />

      <Card className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold text-muted">Seu plano atual</p>
          <p className="font-display text-lg font-bold">{current.name}</p>
          {plan.demo && (
            <p className="text-xs text-orange-ink">
              Modo demonstração: todos os recursos liberados para você conhecer.
            </p>
          )}
          {plan.isTrial && (
            <p className="text-xs text-forest">Teste grátis — faltam {plan.daysLeft} dia(s)</p>
          )}
          {!plan.isTrial && plan.daysLeft !== null && (
            <p className="text-xs text-muted">
              {plan.daysLeft > 3650
                ? "Acesso permanente, sem cobrança"
                : plan.canceledAtPeriodEnd
                  ? `Válido por mais ${plan.daysLeft} dia(s), sem renovação`
                  : `Renova em ${plan.daysLeft} dia(s)`}
            </p>
          )}
        </div>
        {plan.plan !== "gratis" && !plan.isTrial && <Badge tone="forest">Ativo</Badge>}
      </Card>

      {msg && (
        <p
          role="status"
          className={cn(
            "rounded-xl px-3 py-2 text-sm",
            msg.tone === "ok"
              ? "bg-sage-soft text-forest"
              : msg.tone === "warn"
                ? "bg-orange-soft text-orange-ink"
                : "bg-error-soft text-error",
          )}
        >
          {msg.text}
        </p>
      )}

      {!plan.demo && plan.plan === "gratis" && !plan.trialUsed && (
        <Button block size="lg" variant="accent" onClick={trial} disabled={busy !== null}>
          <Sparkles /> Testar o Leveza Plus por {TRIAL_DAYS} dias grátis
        </Button>
      )}

      <div
        role="radiogroup"
        aria-label="Forma de pagamento"
        className="grid grid-cols-2 rounded-button bg-line/60 p-1"
      >
        {(["anual", "mensal"] as const).map((p) => (
          <button
            key={p}
            role="radio"
            aria-checked={period === p}
            onClick={() => setPeriod(p)}
            className={`min-h-11 rounded-[12px] text-sm font-semibold ${period === p ? "bg-card text-forest shadow-card" : "text-muted"}`}
          >
            {p === "anual" ? "Anual (Pix ou cartão)" : "Mensal (cartão)"}
          </button>
        ))}
      </div>

      {(Object.keys(PLANS) as PlanId[]).map((id) => {
        const def = PLANS[id];
        const price = def.prices?.[period];
        const isCurrent = plan.plan === id && !plan.isTrial;
        return (
          <Card key={id} className={cn("space-y-3", id === "plus" && "border-forest")}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-bold">{def.name}</p>
                <p className="text-sm text-muted">{def.tagline}</p>
              </div>
              {id === "plus" && (
                <Badge tone="orange" className="whitespace-nowrap">
                  Mais escolhido
                </Badge>
              )}
            </div>
            <p className="tabular font-display text-2xl font-bold text-forest">
              {price ? formatBRL(price) : "R$ 0"}
              {price && (
                <span className="text-sm font-semibold text-muted">
                  /{period === "anual" ? "ano" : "mês"}
                </span>
              )}
            </p>
            {price && period === "anual" && (
              <p className="tabular -mt-2 text-xs text-muted">
                equivale a {formatBRL(price / 12)}/mês · até 12× no cartão
              </p>
            )}
            <ul className="space-y-1.5 text-sm">
              {def.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden /> {h}
                </li>
              ))}
            </ul>
            {id !== "gratis" &&
              (isCurrent ? (
                <p className="text-sm font-semibold text-forest">Este é o seu plano.</p>
              ) : (
                <Button
                  block
                  onClick={() => checkout(id)}
                  disabled={busy !== null || payReady !== true || plan.demo}
                >
                  {busy === id
                    ? "Abrindo pagamento…"
                    : `Assinar ${def.name.replace("Leveza ", "")}`}
                </Button>
              ))}
          </Card>
        );
      })}

      {payReady === false && !plan.demo && (
        <CardHint>
          Os pagamentos estão sendo configurados. Em breve você poderá assinar por aqui.
        </CardHint>
      )}
      {plan.demo && <CardHint>Para assinar, crie uma conta no app publicado.</CardHint>}

      {plan.plan !== "gratis" &&
        !plan.isTrial &&
        !plan.canceledAtPeriodEnd &&
        plan.period === "mensal" && (
          <Button variant="ghost" block onClick={() => setConfirmCancel(true)}>
            Cancelar renovação mensal
          </Button>
        )}
      <CardHint>
        Pagamento processado pelo Mercado Pago. O plano anual não renova sozinho; o mensal renova
        até você cancelar. Você pode cancelar a qualquer momento e continua com o plano até o fim do
        período pago.
      </CardHint>
      <ConfirmationDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancelar a renovação?"
        description="Você continua com o plano até o fim do período já pago. Depois, volta para o Leveza Grátis sem perder seus registros."
        confirmLabel="Cancelar renovação"
        danger
        onConfirm={cancel}
      />
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PlansInner />
    </Suspense>
  );
}
