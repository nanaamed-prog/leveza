"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChoiceGroup, Field, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { EligibilityNotice } from "@/components/leveza/EligibilityNotice";
import { useAppData } from "@/lib/data/provider";
import { useDaySummary, usePersonalBasics } from "@/lib/data/useDaySummary";
import { calculateBmi, healthyWeightRange } from "@/lib/calc/bmi";
import {
  assessWeightGoal,
  kcalTargetFloor,
  suggestIntakeTarget,
  type GoalType,
} from "@/lib/calc/weight";
import { fmt1, fmtInt, todayKey } from "@/lib/utils";

export default function PlanPage() {
  const { goal } = useAppData();
  return <PlanInner key={goal?.id ?? "sem-meta"} />;
}

function PlanInner() {
  const { tz, store, refresh, goal, eligibility } = useAppData();
  const basics = usePersonalBasics();
  const summary = useDaySummary(todayKey(tz));
  const [type, setType] = useState<GoalType>(goal?.type ?? "habitos");
  const [target, setTarget] = useState(goal?.target_weight_kg ? String(goal.target_weight_kg) : "");
  const [kcal, setKcal] = useState(goal?.kcal_target ? String(goal.kcal_target) : "");
  const [rate, setRate] = useState(goal?.weekly_rate_kg ? String(goal.weekly_rate_kg) : "");
  const [msg, setMsg] = useState<string | null>(null);

  let bmi: ReturnType<typeof calculateBmi> | null = null;
  try {
    if (basics.weight && basics.height && basics.age !== null)
      bmi = calculateBmi(basics.weight, basics.height, basics.age);
  } catch {
    bmi = null;
  }
  const n = (s: string) => (s.trim() ? Number(s.replace(",", ".")) : null);
  const assessment =
    basics.weight && basics.height
      ? assessWeightGoal({
          goal: type,
          currentKg: basics.weight,
          targetKg: n(target),
          heightCm: basics.height,
          weeklyRateKg: n(rate),
        })
      : null;
  const projected = summary.energy?.projected24h.kcal ?? 0;
  const suggestion = suggestIntakeTarget({
    goal: type,
    projectedExpenditure: projected,
    bmr: basics.bmr?.kcal ?? null,
    deficitAllowed: eligibility.calorieDeficit.allowed,
  });
  const kcalN = n(kcal);
  const kcalFloor = kcalTargetFloor({
    deficitAllowed: eligibility.calorieDeficit.allowed,
    bmrLow: basics.bmr?.low ?? null,
    projectedExpenditure: summary.energy?.projected24h.kcal ?? null,
  });
  const kcalTooLow = kcalN !== null && kcalN < kcalFloor;

  async function save() {
    if (!store) return;
    if (type === "perder" && !eligibility.weightLoss.allowed)
      return setMsg("Meta de perda de peso indisponível para o seu perfil.");
    if (assessment?.level === "bloqueada")
      return setMsg("Ajuste o peso desejado para uma faixa segura.");
    if (kcalTooLow)
      return setMsg(
        `Não salvamos metas abaixo de ${fmtInt(kcalFloor)} kcal. Converse com um profissional sobre metas individualizadas.`,
      );
    if (type === "perder" && kcalN !== null && !eligibility.calorieDeficit.allowed)
      return setMsg("Meta calórica de déficit indisponível para o seu perfil.");
    if (goal) await store.update("goals", goal.id, { status: "encerrada" });
    await store.insert("goals", {
      type,
      target_weight_kg: type === "perder" || type === "ganhar" ? n(target) : null,
      kcal_target: kcalN,
      weekly_rate_kg: type === "perder" || type === "ganhar" ? n(rate) : null,
      status: "ativa",
    });
    setMsg("Plano atualizado.");
    refresh();
  }

  const range = basics.height ? healthyWeightRange(basics.height) : null;

  return (
    <div className="space-y-4">
      <PageHeader title="Meu plano" back="/app/perfil" />

      <Card>
        <CardTitle>IMC</CardTitle>
        {basics.age !== null && basics.age < 18 ? (
          <CardHint className="mt-1">
            As categorias de IMC adulto não se aplicam a menores de 18 anos. Para essa fase, o
            acompanhamento usa curvas por idade com um profissional.
          </CardHint>
        ) : bmi ? (
          <>
            <p className="tabular mt-1 font-display text-2xl font-bold">
              {bmi.display} <Badge tone="neutral">{bmi.label}</Badge>
            </p>
            {range && (
              <CardHint className="mt-1">
                Referência populacional para sua altura (IMC 18,5–24,9): {fmt1(range.min)}–
                {fmt1(range.max)} kg. Não é “peso ideal” individual.
              </CardHint>
            )}
            <CardHint className="mt-1">
              IMC é indicador de triagem: não mede composição corporal nem faz diagnóstico.
            </CardHint>
          </>
        ) : (
          <CardHint className="mt-1">Registre peso e altura para calcular.</CardHint>
        )}
      </Card>

      <Card>
        <CardTitle>Metabolismo basal estimado</CardTitle>
        {basics.bmr ? (
          <>
            <p className="tabular mt-1 font-display text-2xl font-bold">
              {basics.bmr.isRange
                ? `${fmtInt(basics.bmr.low)}–${fmtInt(basics.bmr.high)}`
                : `≈ ${fmtInt(basics.bmr.kcal)}`}{" "}
              <span className="text-sm text-muted">kcal/dia</span>
            </p>
            <CardHint className="mt-1">
              Mifflin–St Jeor: 10 × peso + 6,25 × altura − 5 × idade{" "}
              {basics.bmr.isRange
                ? "(faixa entre os dois parâmetros da equação, porque você preferiu não informar)"
                : "+ parâmetro escolhido"}
              . Estimativa com erro individual frequente de ±10%.
            </CardHint>
          </>
        ) : (
          <CardHint className="mt-1">
            Precisamos de peso, altura e data de nascimento (adulto).
          </CardHint>
        )}
        {summary.energy && (
          <p className="tabular mt-2 text-sm">
            Projeção de gasto para hoje: {fmtInt(projected)} kcal
          </p>
        )}
      </Card>

      <Card className="space-y-4">
        <CardTitle>Objetivo</CardTitle>
        <ChoiceGroup
          legend="O que você quer agora?"
          value={type}
          onChange={setType}
          options={[
            { value: "habitos", label: "Acompanhar hábitos" },
            { value: "manter", label: "Manter o peso" },
            ...(eligibility.weightLoss.allowed
              ? [{ value: "perder" as const, label: "Perder peso" }]
              : []),
            ...(eligibility.mode === "padrao"
              ? [{ value: "ganhar" as const, label: "Ganhar peso" }]
              : []),
          ]}
        />
        {!eligibility.weightLoss.allowed && (
          <EligibilityNotice
            title="Perda de peso indisponível"
            reasons={eligibility.weightLoss.reasons}
          />
        )}
        {(type === "perder" || type === "ganhar") && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Peso desejado (kg)" hint="Opcional e ajustável.">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  inputMode="decimal"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              )}
            </Field>
            <Field label="Ritmo (kg/semana)" hint="Opcional. Gradual é melhor.">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              )}
            </Field>
          </div>
        )}
        {assessment && assessment.messages.length > 0 && (
          <div
            role="alert"
            className={`rounded-xl px-3 py-2 text-sm ${assessment.level === "bloqueada" ? "bg-error-soft text-error" : "bg-orange-soft text-orange-ink"}`}
          >
            {assessment.messages.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </div>
        )}
        {
          <div className="space-y-2">
            <Field
              label="Meta diária de consumo (kcal) — opcional"
              hint="Usada só para o anel de progresso no início."
              error={kcalTooLow ? `Abaixo de ${fmtInt(kcalFloor)} kcal não é aceito.` : undefined}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  inputMode="numeric"
                  value={kcal}
                  onChange={(e) => setKcal(e.target.value)}
                />
              )}
            </Field>
            {suggestion ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setKcal(String(suggestion.kcal))}
              >
                Usar sugestão: {fmtInt(suggestion.kcal)} kcal ({suggestion.note})
              </Button>
            ) : type === "perder" && !eligibility.calorieDeficit.allowed ? (
              <CardHint>Não sugerimos déficit calórico para o seu perfil de triagem.</CardHint>
            ) : null}
          </div>
        }
        {msg && (
          <p role="status" className="text-sm font-semibold text-forest">
            {msg}
          </p>
        )}
        <Button block size="lg" onClick={save}>
          Salvar plano
        </Button>
      </Card>
    </div>
  );
}
