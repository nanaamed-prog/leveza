"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/form";
import { ScreeningForm, EMPTY_SCREENING } from "@/components/leveza/ScreeningForm";
import { EligibilityNotice } from "@/components/leveza/EligibilityNotice";
import { useAppData } from "@/lib/data/provider";
import { evaluateEligibility, type HealthScreening } from "@/lib/calc/eligibility";
import { CONSENT_VERSION } from "@/lib/data/types";
import { formatDateShort, localDateKey } from "@/lib/dates";

export default function ScreeningPage() {
  const { screening } = useAppData();
  return <ScreeningInner key={screening?.id ?? "nova"} />;
}

function ScreeningInner() {
  const { screening, store, refresh, profile, tz } = useAppData();
  const [value, setValue] = useState<HealthScreening>(() => {
    if (!screening) return EMPTY_SCREENING;
    const {
      id: _i,
      user_id: _u,
      created_at: _c,
      updated_at: _up,
      consent_version: _cv,
      ...rest
    } = screening;
    void _i;
    void _u;
    void _c;
    void _up;
    void _cv;
    return rest;
  });
  const [msg, setMsg] = useState<string | null>(null);

  const preview = evaluateEligibility(value);

  async function save() {
    if (!store || !profile) return;
    await store.insert("health_screenings", { ...value, consent_version: CONSENT_VERSION });
    const { id: _i, user_id: _u, created_at: _c, updated_at: _up, ...rest } = profile;
    void _i;
    void _u;
    void _c;
    void _up;
    await store.upsertSingle("profiles", { ...rest, mode: preview.mode });
    // Jejum ativo é encerrado se a nova triagem não permitir mais
    if (!preview.fasting.allowed) {
      const active = (await store.list("fasting_sessions", { limit: 5 })).filter(
        (s) => !s.ended_at,
      );
      for (const s of active)
        await store.update("fasting_sessions", s.id, { ended_at: new Date().toISOString() });
    }
    setMsg("Triagem atualizada. As funções disponíveis foram ajustadas.");
    refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Triagem de saúde"
        subtitle={
          screening
            ? `Última atualização: ${formatDateShort(localDateKey(Date.parse(screening.created_at), tz))}`
            : undefined
        }
        back="/app/perfil"
      />
      <Card>
        <ScreeningForm value={value} onChange={setValue} />
        <div className="mt-4">
          <Checkbox
            checked={value.consent_health_data}
            onChange={(v) => setValue({ ...value, consent_health_data: v })}
            label="Autorizo o tratamento dos meus dados de saúde"
          />
        </div>
      </Card>
      {!preview.fasting.allowed && (
        <EligibilityNotice
          title="Com estas respostas, jejum e déficit ficam indisponíveis"
          reasons={preview.fasting.reasons}
          showScreeningLink={false}
        />
      )}
      {msg && (
        <p role="status" className="rounded-xl bg-sage-soft px-3 py-2 text-sm text-forest">
          {msg}
        </p>
      )}
      <Button block size="lg" onClick={save}>
        Salvar triagem
      </Button>
      <p className="text-xs text-muted">
        Cada atualização fica registrada com data e versão do consentimento.
      </p>
    </div>
  );
}
