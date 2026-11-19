"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, CircleAlert, Lock, Play, Soup } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/form";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { EligibilityNotice } from "@/components/leveza/EligibilityNotice";
import { FastingTimer } from "@/components/leveza/FastingTimer";
import { PlusGate } from "@/components/leveza/PlusGate";
import { useAppData, useRecords } from "@/lib/data/provider";
import { canStartFasting, FASTING_PROTOCOLS, type FastingProtocol } from "@/lib/calc/eligibility";
import {
  BREAK_FAST_IDEAS,
  FASTING_EDUCATION,
  FASTING_WARNING_SIGNS,
  formatHms,
} from "@/lib/calc/fasting";
import { formatDateShort, localDateKey } from "@/lib/dates";

function Education() {
  return (
    <>
      <Card className="p-4">
        <CardTitle className="text-base">O que acontece no seu corpo?</CardTitle>
        <ol className="relative mt-3 space-y-3">
          <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-0.5 bg-forest/70" />
          {FASTING_EDUCATION.map((e) => (
            <li key={e.phase} className="relative grid grid-cols-[1.25rem_6.5rem_1fr] gap-1">
              <span aria-hidden className="mt-1 size-3 rounded-full bg-forest ring-2 ring-card" />
              <p className="text-sm font-bold text-ink">{e.phase}</p>
              <p className="text-xs leading-snug text-ink/85">{e.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[0.7rem] text-muted">
          Linha do tempo qualitativa: não existe hora exata em que começam cetose, autofagia ou
          “queima de gordura”. Varia por pessoa, e mais horas não significam mais benefício.
        </p>
      </Card>
    </>
  );
}

function Warnings() {
  return (
    <>
      <Card className="border-error/30">
        <CardTitle className="flex items-center gap-2 text-error">
          <CircleAlert className="size-5" aria-hidden /> Interrompa e procure ajuda se sentir
        </CardTitle>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
          {FASTING_WARNING_SIGNS.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-ink">
          Em caso de desmaio, confusão ou sintomas intensos, procure atendimento de urgência (SAMU
          192).
        </p>
      </Card>
    </>
  );
}

function BreakFast({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-card border border-orange/30 bg-orange-soft">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <Soup className="size-10 shrink-0 text-orange-ink" strokeWidth={1.6} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-display font-bold text-ink">Como quebrar o jejum?</span>
          <span className="block text-xs text-ink/80">
            Veja opções saudáveis e equilibradas para sua primeira refeição.
          </span>
        </span>
        <ChevronRight
          className={`size-5 shrink-0 text-orange-ink transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="border-t border-orange/20 px-4 pb-4 pt-3">
          <p className="text-xs text-ink/80">
            Uma refeição equilibrada, em porção confortável, com proteína, fibras, vegetais e
            carboidrato adequado. Nada obrigatório nem para “compensar”.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
            {BREAK_FAST_IDEAS.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function FastingPage() {
  const { tz, store, refresh, eligibility } = useAppData();
  const sessions = useRecords("fasting_sessions", { limit: 30 });
  const active = sessions.data.find((s) => !s.ended_at);
  const [protocol, setProtocol] = useState<FastingProtocol>(12);
  const [conf, setConf] = useState({ pro: false, pro24: false });
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);

  if (eligibility.mode === "lactante") {
    return (
      <div className="space-y-4">
        <PageHeader title="Jejum" back="/app" />
        <EligibilityNotice
          title="Indisponível durante a amamentação"
          reasons={eligibility.fasting.reasons.slice(0, 1)}
        />
        <Link href="/app/lactante" className="block font-semibold text-forest underline">
          Ir para o Modo Lactante
        </Link>
      </div>
    );
  }

  const gate = canStartFasting(eligibility, {
    protocol,
    confirmedProfessionalFollowUp: conf.pro,
    confirmedProfessional24h: conf.pro24,
  });
  const pStatus = eligibility.fastingProtocols[protocol].status;

  async function start() {
    if (!store) return;
    if (!gate.allowed) return setError(gate.reasons[0] ?? "Indisponível.");
    setError(null);
    const now = Date.now();
    try {
      await store.insert("fasting_sessions", {
        protocol_hours: protocol,
        started_at: new Date(now).toISOString(),
        expected_end_at: new Date(now + protocol * 3_600_000).toISOString(),
        ended_at: null,
        professional_confirmed: conf.pro,
        professional_24h_confirmed: conf.pro24,
      });
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Jejum Intermitente" back="/app" />

      {eligibility.fasting.allowed && (
        <div
          role="group"
          aria-label="Duração do jejum"
          className="-mx-1 flex justify-between gap-1 overflow-x-auto px-1"
        >
          {FASTING_PROTOCOLS.map((p) => {
            const st = eligibility.fastingProtocols[p].status;
            const sel = active ? active.protocol_hours === p : protocol === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={sel}
                disabled={Boolean(active) && !sel}
                aria-label={`${p} h${st !== "disponivel" ? " (com acompanhamento profissional)" : ""}`}
                onClick={() => {
                  if (active) return;
                  setProtocol(p);
                  setError(null);
                }}
                className={`relative flex min-h-11 min-w-12 shrink-0 items-center justify-center rounded-full px-3 font-display text-base font-bold disabled:opacity-60 ${sel ? "bg-forest text-white" : "text-ink"}`}
              >
                {p}h
                {st !== "disponivel" && (
                  <Lock
                    className={`absolute -top-0.5 right-0 size-3 ${sel ? "text-forest" : "text-muted"}`}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {!eligibility.fasting.allowed ? (
        <EligibilityNotice
          title="Jejum indisponível para você"
          reasons={eligibility.fasting.reasons}
        />
      ) : active ? (
        <section
          aria-label={`Jejum de ${active.protocol_hours} h em andamento`}
          className="space-y-4"
        >
          <FastingTimer
            startedAt={Date.parse(active.started_at)}
            hours={active.protocol_hours}
            tz={tz}
          />
          <button
            type="button"
            onClick={() => setConfirmEnd(true)}
            className="flex min-h-14 w-full items-center justify-center rounded-full bg-[#D96A1C] font-display text-lg font-bold text-white shadow-card hover:brightness-95"
          >
            Encerrar jejum
          </button>
          <p className="text-center text-xs text-muted">
            Você pode encerrar a qualquer momento. Ouvir o seu corpo é sempre a escolha certa.
          </p>
        </section>
      ) : (
        <Card className="space-y-4">
          <p className="text-sm text-ink">
            Jejum de <strong>{protocol} horas</strong> selecionado. Escolher um protocolo não é
            recomendação universal.
          </p>
          {pStatus === "requer_confirmacao_profissional" && (
            <div className="space-y-2">
              <p className="rounded-xl bg-orange-soft px-3 py-2 text-sm text-orange-ink">
                {eligibility.fastingProtocols[protocol].reasons[0]}
              </p>
              <Checkbox
                checked={conf.pro}
                onChange={(v) => setConf({ ...conf, pro: v })}
                label="Tenho acompanhamento de um profissional de saúde que conhece meu caso"
              />
              {protocol === 24 && (
                <Checkbox
                  checked={conf.pro24}
                  onChange={(v) => setConf({ ...conf, pro24: v })}
                  label="Esse profissional orientou especificamente o jejum de 24 horas para mim"
                />
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm font-semibold text-error">
              {error}
            </p>
          )}
          <Button block size="lg" onClick={start} disabled={!gate.allowed}>
            <Play /> Iniciar jejum de {protocol} h
          </Button>
          <p className="text-xs text-muted">
            Beba água ao longo do jejum. Se tiver dúvida sobre seus medicamentos, converse com seu
            médico antes.
          </p>
        </Card>
      )}

      <Education />

      {eligibility.fasting.allowed && (
        <BreakFast open={breakOpen} onToggle={() => setBreakOpen((o) => !o)} />
      )}

      <Warnings />

      <PlusGate
        feature="jejum_historico"
        title="Histórico de jejuns"
        text="Veja todos os seus jejuns anteriores no Leveza Plus. O cronômetro continua grátis."
      >
        {sessions.data.filter((s) => s.ended_at).length > 0 && (
          <Card>
            <CardTitle className="mb-2">Histórico</CardTitle>
            <ul className="divide-y divide-line text-sm">
              {sessions.data
                .filter((s) => s.ended_at)
                .map((s) => (
                  <li key={s.id} className="flex justify-between py-2">
                    <span>
                      {formatDateShort(localDateKey(Date.parse(s.started_at), tz))} · plano{" "}
                      {s.protocol_hours} h
                    </span>
                    <span className="tabular text-muted">
                      {formatHms(Date.parse(s.ended_at!) - Date.parse(s.started_at))}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        )}
      </PlusGate>

      <ConfirmationDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title="Encerrar o jejum agora?"
        description="Tudo bem encerrar quando quiser. O tempo até aqui fica no seu histórico."
        confirmLabel="Encerrar"
        onConfirm={async () => {
          if (store && active)
            await store.update("fasting_sessions", active.id, {
              ended_at: new Date().toISOString(),
            });
          setBreakOpen(true);
          refresh();
        }}
      />
    </div>
  );
}
