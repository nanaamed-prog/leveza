"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bike,
  Dumbbell,
  Footprints,
  Music,
  Pencil,
  PersonStanding,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog, Sheet } from "@/components/ui/dialog";
import { ActivityPicker } from "@/components/leveza/ActivityPicker";
import { EmptyState } from "@/components/leveza/EmptyState";
import { SimpleBarChart, CHART } from "@/components/leveza/charts";
import { useAppData, useRecords } from "@/lib/data/provider";
import { usePersonalBasics } from "@/lib/data/useDaySummary";
import { activityLabel, INTENSITY_LABELS } from "@/lib/calc/met";
import {
  addDays,
  dayRange,
  formatDateShort,
  formatDuration,
  formatTime,
  localDateKey,
  startOfWeek,
} from "@/lib/dates";
import type { ActivityEntry, Insert } from "@/lib/data/types";
import { fmtInt, todayKey } from "@/lib/utils";
import { LoadingSkeleton } from "@/components/leveza/LoadingSkeleton";

function MovementInner() {
  const params = useSearchParams();
  const { tz, store, refresh, profile } = useAppData();
  const basics = usePersonalBasics();
  const today = todayKey(tz);
  const from = dayRange(addDays(today, -30), tz).start;
  const acts = useRecords("activity_entries", { from: new Date(from).toISOString() });
  const [open, setOpen] = useState(() => params.get("novo") === "1");
  const [editing, setEditing] = useState<ActivityEntry | null>(null);
  const [presetType, setPresetType] = useState<string | undefined>(undefined);
  const [toDelete, setToDelete] = useState<ActivityEntry | null>(null);

  const mins = (a: ActivityEntry) => (Date.parse(a.ended_at) - Date.parse(a.started_at)) / 60_000;
  const weekStart = startOfWeek(today, profile?.week_starts_on ?? 1);
  const monthStart = today.slice(0, 8) + "01";
  const totals = useMemo(() => {
    const t = { dia: 0, semana: 0, mes: 0, kcalSemana: 0 };
    for (const a of acts.data) {
      const k = localDateKey(Date.parse(a.started_at), tz);
      if (k === today) t.dia += mins(a);
      if (k >= weekStart) {
        t.semana += mins(a);
        t.kcalSemana += a.kcal_estimated;
      }
      if (k >= monthStart) t.mes += mins(a);
    }
    return t;
  }, [acts.data, tz, today, weekStart, monthStart]);

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of acts.data) m.set(a.activity_type, (m.get(a.activity_type) ?? 0) + mins(a));
    return [...m.entries()]
      .map(([k, v]) => ({ nome: activityLabel(k), minutos: Math.round(v) }))
      .sort((a, b) => b.minutos - a.minutos)
      .slice(0, 6);
  }, [acts.data]);

  async function save(row: Insert<"activity_entries">) {
    if (!store) return;
    if (editing) await store.update("activity_entries", editing.id, row);
    else await store.insert("activity_entries", row);
    setOpen(false);
    setEditing(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Meu movimento"
        subtitle="Mexer o corpo é cuidado — não é moeda para “merecer” comida."
        action={
          <Button size="icon" aria-label="Registrar atividade" onClick={() => setOpen(true)}>
            <Plus />
          </Button>
        }
      />
      <div
        role="tablist"
        aria-label="Movimento e sono"
        className="grid grid-cols-2 rounded-full bg-line/60 p-1"
      >
        <span
          role="tab"
          aria-selected="true"
          className="flex min-h-10 items-center justify-center rounded-full bg-forest text-sm font-semibold text-white"
        >
          Atividade física
        </span>
        <Link
          role="tab"
          aria-selected="false"
          href="/app/sono"
          className="flex min-h-10 items-center justify-center rounded-full text-sm font-semibold text-muted"
        >
          Sono
        </Link>
      </div>

      <section
        aria-label="Registrar atividade"
        className="rounded-card border border-line bg-card p-3 shadow-card"
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display font-semibold">
            <Footprints className="size-5 text-forest" aria-hidden /> Registrar atividade
          </h2>
          <button
            type="button"
            onClick={() => {
              setPresetType(undefined);
              setOpen(true);
            }}
            aria-label="Outra atividade"
            className="flex size-9 items-center justify-center rounded-full bg-forest text-white"
          >
            <Plus className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["caminhada", "Caminhada", PersonStanding],
              ["musculacao", "Musculação", Dumbbell],
              ["danca", "Dança", Music],
              ["pilates", "Pilates", PersonStanding],
              ["bicicleta", "Bike", Bike],
              ["funcional", "Funcional", Zap],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setPresetType(id);
                setEditing(null);
                setOpen(true);
              }}
              className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-canvas text-xs font-semibold text-ink hover:border-sage"
            >
              <Icon className="size-6 text-forest" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Hoje", totals.dia],
          ["Semana", totals.semana],
          ["Mês", totals.mes],
        ].map(([l, v]) => (
          <Card key={l as string} className="p-3">
            <p className="text-xs font-semibold text-muted">{l}</p>
            <p className="tabular font-display text-lg font-bold">
              {(v as number) > 0 ? formatDuration(v as number) : "—"}
            </p>
          </Card>
        ))}
      </div>

      {byType.length > 0 && (
        <Card>
          <CardTitle className="mb-2">Minutos por modalidade (30 dias)</CardTitle>
          <SimpleBarChart
            data={byType}
            xKey="nome"
            bars={[{ key: "minutos", name: "Minutos", color: CHART.mineral }]}
            unit="min"
            title="Minutos por modalidade"
            description={byType.map((b) => `${b.nome}: ${b.minutos} minutos`).join("; ")}
          />
          <p className="tabular mt-1 text-xs text-muted">
            Gasto estimado nas atividades da semana: {fmtInt(totals.kcalSemana)} kcal.
          </p>
        </Card>
      )}

      {acts.loading ? null : acts.data.length === 0 ? (
        <EmptyState
          icon={Footprints}
          title="Nenhuma atividade nos últimos 30 dias"
          text="Caminhada, dança, faxina, alongamento… tudo conta."
          action={<Button onClick={() => setOpen(true)}>Registrar atividade</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {acts.data.map((a) => (
            <li key={a.id}>
              <Card className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {a.custom_name || activityLabel(a.activity_type)}
                  </p>
                  <p className="tabular text-xs text-muted">
                    {formatDateShort(localDateKey(Date.parse(a.started_at), tz))} ·{" "}
                    {formatTime(Date.parse(a.started_at), tz)} · {formatDuration(mins(a))} ·{" "}
                    {INTENSITY_LABELS[a.intensity]} · MET {a.met.toLocaleString("pt-BR")} · ≈{" "}
                    {fmtInt(a.kcal_estimated)} kcal
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar"
                  onClick={() => {
                    setEditing(a);
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
                  onClick={() => setToDelete(a)}
                >
                  <Trash2 />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        title={editing ? "Editar atividade" : "Registrar atividade"}
      >
        <ActivityPicker
          initialType={presetType}
          key={editing?.id ?? `novo-${presetType ?? ""}`}
          tz={tz}
          weightKg={basics.weight}
          factor={basics.factor}
          initial={editing}
          onSubmit={save}
        />
      </Sheet>
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir atividade?"
        description="O registro será apagado."
        confirmLabel="Excluir"
        danger
        onConfirm={async () => {
          if (store && toDelete) await store.remove("activity_entries", toDelete.id);
          refresh();
        }}
      />
    </div>
  );
}

export default function MovementPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <MovementInner />
    </Suspense>
  );
}
