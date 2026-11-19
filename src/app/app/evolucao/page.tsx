"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Scale, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog, Sheet } from "@/components/ui/dialog";
import { WeightForm } from "@/components/leveza/WeightForm";
import { EmptyState } from "@/components/leveza/EmptyState";
import { PeriodFilter, SimpleLineChart, CHART } from "@/components/leveza/charts";
import { useAppData, useRecords } from "@/lib/data/provider";
import { addDays, dayRange, formatDateShort, formatTime, localDateKey } from "@/lib/dates";
import { changeFromBaseline, movingAverage } from "@/lib/calc/weight";
import type { Insert, WeightEntry } from "@/lib/data/types";
import { fmt1, todayKey } from "@/lib/utils";

export default function EvolutionPage() {
  const { tz, store, refresh, goal } = useAppData();
  const today = todayKey(tz);
  const [period, setPeriod] = useState(30);
  const all = useRecords("weight_entries", { order: "asc", limit: 2000 });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WeightEntry | null>(null);
  const [toDelete, setToDelete] = useState<WeightEntry | null>(null);

  const from = localDateKey(dayRange(addDays(today, -period + 1), tz).start, tz);
  const points = useMemo(() => {
    // Um ponto por dia (último registro do dia)
    const byDay = new Map<string, number>();
    for (const w of all.data) byDay.set(localDateKey(Date.parse(w.measured_at), tz), w.weight_kg);
    return [...byDay.entries()]
      .map(([date, kg]) => ({ date, kg }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [all.data, tz]);
  const ma = useMemo(() => movingAverage(points, 7), [points]);
  const inPeriod = points.filter((p) => p.date >= from);
  const chart = inPeriod.map((p) => ({
    dia: formatDateShort(p.date),
    peso: p.kg,
    media: Math.round((ma.find((m) => m.date === p.date)?.avg ?? p.kg) * 10) / 10,
  }));
  const base = changeFromBaseline(points);
  const per = changeFromBaseline(inPeriod);

  const weekAvg = (offset: number) => {
    const s = addDays(today, -6 - offset * 7);
    const e = addDays(today, -offset * 7);
    const xs = points.filter((p) => p.date >= s && p.date <= e);
    return xs.length ? xs.reduce((t, p) => t + p.kg, 0) / xs.length : null;
  };
  const w0 = weekAvg(0);
  const w1 = weekAvg(1);

  async function save(row: Insert<"weight_entries">) {
    if (!store) return;
    if (editing) await store.update("weight_entries", editing.id, row);
    else await store.insert("weight_entries", row);
    setOpen(false);
    setEditing(null);
    refresh();
  }

  const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt1(Math.abs(n))} kg`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Evolução"
        action={
          <Button size="icon" aria-label="Registrar peso" onClick={() => setOpen(true)}>
            <Plus />
          </Button>
        }
      />
      <PeriodFilter value={period} onChange={setPeriod} />

      {points.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Nenhum peso registrado"
          text="O peso é opcional. Você pode acompanhar só hábitos."
          action={<Button onClick={() => setOpen(true)}>Registrar peso</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Card className="p-3">
              <p className="text-xs font-semibold text-muted">Média 7 dias</p>
              <p className="tabular font-display text-lg font-bold">
                {w0 !== null ? `${fmt1(w0)} kg` : "—"}
              </p>
              {w0 !== null && w1 !== null && (
                <p className="tabular text-[0.7rem] text-muted">
                  {signed(w0 - w1)} vs semana anterior
                </p>
              )}
            </Card>
            <Card className="p-3">
              <p className="text-xs font-semibold text-muted">No período</p>
              <p className="tabular font-display text-lg font-bold">
                {per ? signed(per.delta) : "—"}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs font-semibold text-muted">Desde o início</p>
              <p className="tabular font-display text-lg font-bold">
                {base ? signed(base.delta) : "—"}
              </p>
            </Card>
          </div>
          <Card>
            <CardTitle className="mb-2">Peso e média móvel de 7 dias</CardTitle>
            {chart.length > 0 ? (
              <SimpleLineChart
                data={chart}
                xKey="dia"
                lines={[
                  { key: "peso", name: "Registro", color: CHART.sage },
                  { key: "media", name: "Média 7 dias", color: CHART.forest },
                ]}
                unit="kg"
                title="Evolução do peso"
                description={`${chart.length} registros no período`}
              />
            ) : (
              <CardHint>Sem registros neste período.</CardHint>
            )}
            <CardHint className="mt-2">
              O peso oscila de um dia para o outro (água, intestino, ciclo, sal). Observe a média,
              não o número isolado. Não há previsão de data garantida.
            </CardHint>
            {goal?.target_weight_kg && (
              <p className="mt-2 text-sm text-ink">
                Seu objetivo: <strong>{fmt1(goal.target_weight_kg)} kg</strong>.{" "}
                <Link href="/app/plano" className="font-semibold text-forest underline">
                  Ajustar
                </Link>
              </p>
            )}
          </Card>
          <ul className="space-y-2">
            {[...all.data]
              .reverse()
              .slice(0, 30)
              .map((w) => (
                <li key={w.id}>
                  <Card className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="tabular font-semibold">{fmt1(w.weight_kg)} kg</p>
                      <p className="tabular truncate text-xs text-muted">
                        {formatDateShort(localDateKey(Date.parse(w.measured_at), tz))}{" "}
                        {formatTime(Date.parse(w.measured_at), tz)}
                        {w.conditions ? ` · ${w.conditions}` : ""}
                        {w.notes ? ` · ${w.notes}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar"
                      onClick={() => {
                        setEditing(w);
                        setOpen(true);
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir"
                      className="text-error"
                      onClick={() => setToDelete(w)}
                    >
                      <Trash2 />
                    </Button>
                  </Card>
                </li>
              ))}
          </ul>
        </>
      )}
      <Link
        href="/app/relatorios"
        className="block text-center text-sm font-semibold text-forest underline"
      >
        Ver relatórios completos
      </Link>

      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        title={editing ? "Editar peso" : "Registrar peso"}
      >
        <WeightForm key={editing?.id ?? "novo"} tz={tz} initial={editing} onSubmit={save} />
      </Sheet>
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir registro de peso?"
        description="O registro será apagado."
        confirmLabel="Excluir"
        danger
        onConfirm={async () => {
          if (store && toDelete) await store.remove("weight_entries", toDelete.id);
          refresh();
        }}
      />
    </div>
  );
}
