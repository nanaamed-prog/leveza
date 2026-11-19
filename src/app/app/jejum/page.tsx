"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert, Lock, Play } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardTitle>O que acontece ao longo das horas</CardTitle>
        <CardHint className="mt-1">
          Linha do tempo qualitativa e aproximada. Varia por pessoa, refeição anterior, atividade e
          saúde.
        </CardHint>
        <ol className="mt-3 space-y-3 border-l-2 border-sage pl-4">
          {FASTING_EDUCATION.map((e) => (
            <li key={e.phase}>
              <p className="font-semibold text-ink">{e.phase}</p>
              <p className="text-sm text-muted">{e.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">
          Não existe hora exata em que começam cetose, autofagia ou “queima de gordura”. Mais horas
          não significam automaticamente mais benefício.
        </p>
      </Card>
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

export default function FastingPage() {
  const { tz, store, refresh, eligibility } = useAppData();
  const sessions = useRecords("fasting_sessions", { limit: 30 });
  const active = sessions.data.find((s) => !s.ended_at);
  const [protocol, setProtocol] = useState<FastingProtocol>(12);
  const [conf, setConf] = useState({ pro: false, pro24: false });
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [justEnded, setJustEnded] = useState(false);

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
      setJustEnded(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Jejum intermitente"
        subtitle="Escolher um protocolo não é recomendação universal."
        back="/app"
      />

      {!eligibility.fasting.allowed ? (
        <EligibilityNotice
          title="Jejum indisponível para você"
          reasons={eligibility.fasting.reasons}
        />
      ) : active ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Jejum de {active.protocol_hours} h</CardTitle>
            <Badge tone="orange">Em andamento</Badge>
          </div>
          <FastingTimer
            startedAt={Date.parse(active.started_at)}
            hours={active.protocol_hours}
            tz={tz}
          />
          <Button variant="accent" block size="lg" onClick={() => setConfirmEnd(true)}>
            Encerrar jejum
          </Button>
          <p className="text-center text-xs text-muted">
            Você pode encerrar a qualquer momento. Ouvir o seu corpo é sempre a escolha certa.
          </p>
        </Card>
      ) : (
        <Card className="space-y-4">
          <fieldset>
            <legend className="mb-2 font-display font-semibold">Duração</legend>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {FASTING_PROTOCOLS.map((p) => {
                const st = eligibility.fastingProtocols[p].status;
                const sel = protocol === p;
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => {
                      setProtocol(p);
                      setError(null);
                    }}
                    className={`flex min-h-12 min-w-16 shrink-0 flex-col items-center justify-center rounded-full border px-3 text-sm font-bold ${sel ? "border-forest bg-forest text-white" : "border-line bg-card text-ink"}`}
                  >
                    {p} h
                    {st !== "disponivel" && (
                      <span
                        className={`flex items-center gap-0.5 text-[0.6rem] font-semibold ${sel ? "text-sage" : "text-muted"}`}
                      >
                        <Lock className="size-3" aria-hidden /> c/ profissional
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
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

      {justEnded && (
        <Card className="space-y-2">
          <CardTitle>Para quebrar o jejum</CardTitle>
          <CardHint>
            Uma refeição equilibrada, em porção confortável, com proteína, fibras, vegetais e
            carboidrato adequado. Nada obrigatório nem para “compensar”.
          </CardHint>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {BREAK_FAST_IDEAS.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Card>
      )}

      <Education />

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
          setJustEnded(true);
          refresh();
        }}
      />
    </div>
  );
}
