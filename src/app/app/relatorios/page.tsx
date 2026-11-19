"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PeriodFilter, SimpleBarChart, SimpleLineChart, CHART } from "@/components/leveza/charts";
import { MacroRing } from "@/components/leveza/MacroRing";
import { useAppData, useRecords } from "@/lib/data/provider";
import { usePersonalBasics } from "@/lib/data/useDaySummary";
import { addDays, dayRange, formatDateShort } from "@/lib/dates";
import { buildDailyReport, toCsv } from "@/lib/reports";
import { estimateBmr } from "@/lib/calc/bmr";
import { activityLabel } from "@/lib/calc/met";
import { fmtInt, todayKey } from "@/lib/utils";

function Empty() {
  return <CardHint>Sem registros neste período. Que tal começar hoje?</CardHint>;
}

export default function ReportsPage() {
  const { tz, profile, eligibility } = useAppData();
  const basics = usePersonalBasics();
  const today = todayKey(tz);
  const [days, setDays] = useState(7);
  const from = new Date(dayRange(addDays(today, -days + 1), tz).start).toISOString();
  const fromWide = new Date(dayRange(addDays(today, -days), tz).start).toISOString();
  const to = new Date(dayRange(today, tz).end).toISOString();

  const foods = useRecords("food_entries", { from, to, limit: 5000 });
  const items = useRecords("food_items", {
    in: { field: "food_entry_id", values: foods.data.map((f) => f.id) },
    limit: 20000,
  });
  const water = useRecords("hydration_entries", { from, to, limit: 5000 });
  const sleeps = useRecords("sleep_entries", {
    from,
    to: new Date(Date.parse(to) + 86_400_000).toISOString(),
    limit: 2000,
  });
  const acts = useRecords("activity_entries", { from: fromWide, to, limit: 5000 });
  const weights = useRecords("weight_entries", { order: "asc", limit: 5000 });
  const habits = useRecords("habit_checkins", {
    from: addDays(today, -days + 1),
    to: addDays(today, 1),
    limit: 5000,
  });
  const fasting = useRecords("fasting_sessions", { from, to, limit: 500 });

  const rows = useMemo(
    () =>
      buildDailyReport({
        endDate: today,
        days,
        tz,
        foods: foods.data,
        items: items.data,
        water: water.data,
        sleeps: sleeps.data,
        acts: acts.data,
        weights: weights.data,
        baselineMet: basics.baselineMet,
        bmrForWeight: (kg) =>
          basics.height && basics.age !== null && basics.age >= 18
            ? estimateBmr({
                weightKg: kg,
                heightCm: basics.height,
                ageYears: basics.age,
                parameter: profile?.equation_parameter ?? "nao_informado",
              })
            : null,
      }),
    [
      today,
      days,
      tz,
      foods.data,
      items.data,
      water.data,
      sleeps.data,
      acts.data,
      weights.data,
      basics,
      profile,
    ],
  );

  const label = (d: string) => formatDateShort(d);
  const energy = rows.map((r) => ({
    dia: label(r.date),
    consumo: Math.round(r.consumed),
    gasto: r.expenditure !== null ? Math.round(r.expenditure) : null,
  }));
  const balance = rows
    .filter((r) => r.balance !== null)
    .map((r) => ({ dia: label(r.date), saldo: Math.round(r.balance!) }));
  const macros = rows.reduce(
    (t, r) => ({
      proteinG: t.proteinG + r.protein,
      carbsG: t.carbsG + r.carbs,
      fatG: t.fatG + r.fat,
    }),
    { proteinG: 0, carbsG: 0, fatG: 0 },
  );
  const sleepData = rows
    .filter((r) => r.sleepMin !== null)
    .map((r) => ({ dia: label(r.date), horas: Math.round((r.sleepMin! / 60) * 10) / 10 }));
  const waterData = rows.map((r) => ({ dia: label(r.date), ml: r.waterMl }));
  const weightData = rows
    .filter((r) => r.weightKg !== null)
    .map((r) => ({ dia: label(r.date), peso: r.weightKg }));
  const byType = Object.entries(
    acts.data
      .filter((a) => a.started_at >= from)
      .reduce<Record<string, number>>((m, a) => {
        m[a.activity_type] =
          (m[a.activity_type] ?? 0) + (Date.parse(a.ended_at) - Date.parse(a.started_at)) / 60_000;
        return m;
      }, {}),
  ).map(([k, v]) => ({ nome: activityLabel(k), minutos: Math.round(v) }));
  const habitData = rows.map((r) => ({
    dia: label(r.date),
    feitos: habits.data.filter((h) => h.date === r.date && h.status === "feito").length,
  }));
  const fastData = fasting.data
    .filter((f) => f.ended_at)
    .map((f) => ({
      dia: formatDateShort(f.started_at.slice(0, 10)),
      horas:
        Math.round(((Date.parse(f.ended_at!) - Date.parse(f.started_at)) / 3_600_000) * 10) / 10,
    }));
  const hasAny = rows.some(
    (r) =>
      r.consumed > 0 ||
      r.waterMl > 0 ||
      r.sleepMin !== null ||
      r.activityMin > 0 ||
      r.weightKg !== null,
  );

  function exportCsv() {
    const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leveza-relatorio-${days}d-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Relatórios"
        back="/app/perfil"
        action={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!hasAny}>
            <Download /> CSV
          </Button>
        }
      />
      <PeriodFilter value={days} onChange={setDays} />
      <p className="text-xs text-muted">
        Consumo e água: informados por você · Peso: medido · Gasto e saldo: estimados.
      </p>

      <Card>
        <CardTitle className="mb-2">Consumo × gasto estimado</CardTitle>
        {energy.some((e) => e.consumo > 0) ? (
          <SimpleBarChart
            data={energy}
            xKey="dia"
            bars={[
              { key: "consumo", name: "Consumo", color: CHART.orange },
              { key: "gasto", name: "Gasto estimado", color: CHART.mineral },
            ]}
            unit="kcal"
            title="Consumo e gasto por dia"
            description="Barras agrupadas de consumo e gasto estimado por dia"
          />
        ) : (
          <Empty />
        )}
      </Card>

      <Card>
        <CardTitle className="mb-2">Saldo energético</CardTitle>
        {balance.length > 0 ? (
          <>
            <SimpleBarChart
              data={balance}
              xKey="dia"
              bars={[{ key: "saldo", name: "Saldo", color: CHART.forest }]}
              unit="kcal"
              title="Saldo por dia"
              description={balance.map((b) => `${b.dia}: ${b.saldo} kcal`).join("; ")}
            />
            <CardHint>
              Saldo = consumido − gasto estimado. Valores negativos significam consumo abaixo do
              gasto estimado. Não é pontuação.
            </CardHint>
          </>
        ) : (
          <Empty />
        )}
      </Card>

      <Card>
        <CardTitle className="mb-3">Distribuição de macros no período</CardTitle>
        {macros.proteinG + macros.carbsG + macros.fatG > 0 ? (
          <MacroRing macros={macros} />
        ) : (
          <Empty />
        )}
      </Card>

      <Card>
        <CardTitle className="mb-2">Peso</CardTitle>
        {weightData.length > 0 ? (
          <SimpleLineChart
            data={weightData}
            xKey="dia"
            lines={[{ key: "peso", name: "Peso", color: CHART.forest }]}
            unit="kg"
            title="Peso"
            description={`${weightData.length} medições`}
          />
        ) : (
          <Empty />
        )}
      </Card>

      <Card>
        <CardTitle className="mb-2">Sono</CardTitle>
        {sleepData.length > 0 ? (
          <SimpleLineChart
            data={sleepData}
            xKey="dia"
            lines={[{ key: "horas", name: "Horas", color: CHART.mineral }]}
            unit="h"
            title="Sono"
            description={`${sleepData.length} noites`}
            domain={[0, "auto"]}
          />
        ) : (
          <Empty />
        )}
      </Card>

      <Card>
        <CardTitle className="mb-2">Movimento por modalidade</CardTitle>
        {byType.length > 0 ? (
          <SimpleBarChart
            data={byType}
            xKey="nome"
            bars={[{ key: "minutos", name: "Minutos", color: CHART.orange }]}
            unit="min"
            title="Movimento"
            description={byType.map((b) => `${b.nome}: ${b.minutos} min`).join("; ")}
          />
        ) : (
          <Empty />
        )}
      </Card>

      <Card>
        <CardTitle className="mb-2">Hidratação</CardTitle>
        {waterData.some((w) => w.ml > 0) ? (
          <SimpleBarChart
            data={waterData}
            xKey="dia"
            bars={[{ key: "ml", name: "Água", color: CHART.mineral }]}
            unit="ml"
            title="Hidratação"
            description="Água por dia"
          />
        ) : (
          <Empty />
        )}
      </Card>

      <Card>
        <CardTitle className="mb-2">Hábitos 5+2 marcados</CardTitle>
        {habitData.some((h) => h.feitos > 0) ? (
          <SimpleBarChart
            data={habitData}
            xKey="dia"
            bars={[{ key: "feitos", name: "Hábitos", color: CHART.forest }]}
            unit="hábitos"
            title="Hábitos"
            description="Hábitos marcados por dia"
          />
        ) : (
          <Empty />
        )}
      </Card>

      {eligibility.fasting.allowed && (
        <Card>
          <CardTitle className="mb-2">Jejum</CardTitle>
          {fastData.length > 0 ? (
            <SimpleBarChart
              data={fastData}
              xKey="dia"
              bars={[{ key: "horas", name: "Horas", color: CHART.orange }]}
              unit="h"
              title="Jejum"
              description="Duração dos jejuns encerrados"
            />
          ) : (
            <Empty />
          )}
        </Card>
      )}
      <p className="text-center text-xs text-muted">
        Total no período: {fmtInt(rows.reduce((s, r) => s + r.consumed, 0))} kcal registradas.
        Exportação em PDF está no roteiro.
      </p>
    </div>
  );
}
