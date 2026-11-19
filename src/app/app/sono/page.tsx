"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Moon, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog, Sheet } from "@/components/ui/dialog";
import { SleepEditor } from "@/components/leveza/SleepEditor";
import { EmptyState } from "@/components/leveza/EmptyState";
import { SimpleLineChart, CHART } from "@/components/leveza/charts";
import { LoadingSkeleton } from "@/components/leveza/LoadingSkeleton";
import { useAppData, useRecords } from "@/lib/data/provider";
import {
  addDays,
  dayRange,
  formatDateShort,
  formatDuration,
  formatTime,
  localDateKey,
  tzOffsetMs,
} from "@/lib/dates";
import { bedtimeRegularity, effectiveSleepMinutes } from "@/lib/calc/sleep";
import type { Insert, SleepEntry } from "@/lib/data/types";
import { todayKey } from "@/lib/utils";

function SleepInner() {
  const params = useSearchParams();
  const { tz, store, refresh } = useAppData();
  const today = todayKey(tz);
  const from = dayRange(addDays(today, -30), tz).start;
  const list = useRecords("sleep_entries", { from: new Date(from).toISOString() });
  const [open, setOpen] = useState(() => params.get("novo") === "1");
  const [editing, setEditing] = useState<SleepEntry | null>(null);
  const [toDelete, setToDelete] = useState<SleepEntry | null>(null);

  const eff = (s: SleepEntry) =>
    effectiveSleepMinutes({
      start: Date.parse(s.started_at),
      end: Date.parse(s.ended_at),
      awakeMinutes: s.awake_minutes,
    });

  const stats = useMemo(() => {
    const d7 = dayRange(addDays(today, -6), tz).start;
    const last7 = list.data.filter((s) => Date.parse(s.ended_at) >= d7);
    const avg = (arr: SleepEntry[]) =>
      arr.length ? arr.reduce((t, s) => t + eff(s), 0) / arr.length : null;
    const bedMins = list.data.map((s) => {
      const ms = Date.parse(s.started_at);
      const local = ms + tzOffsetMs(ms, tz);
      return Math.floor((local % 86_400_000) / 60_000);
    });
    const withEnergy = list.data.filter((s) => s.energy_level !== null);
    const longer = withEnergy.filter((s) => eff(s) >= 420);
    const shorter = withEnergy.filter((s) => eff(s) < 420);
    const mean = (a: SleepEntry[]) =>
      a.length ? a.reduce((t, s) => t + (s.energy_level ?? 0), 0) / a.length : null;
    return {
      avg7: avg(last7),
      avg30: avg(list.data),
      regularity: bedtimeRegularity(bedMins),
      energyLonger: mean(longer),
      energyShorter: mean(shorter),
      nLonger: longer.length,
      nShorter: shorter.length,
    };
  }, [list.data, today, tz]);

  const chart = useMemo(
    () =>
      [...list.data]
        .sort((a, b) => a.ended_at.localeCompare(b.ended_at))
        .map((s) => ({
          dia: formatDateShort(localDateKey(Date.parse(s.ended_at), tz)),
          horas: Math.round((eff(s) / 60) * 10) / 10,
        })),
    [list.data, tz],
  );

  async function save(row: Insert<"sleep_entries">) {
    if (!store) return;
    if (editing) await store.update("sleep_entries", editing.id, row);
    else await store.insert("sleep_entries", row);
    setOpen(false);
    setEditing(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Meu sono"
        back="/app"
        action={
          <Button size="icon" aria-label="Registrar sono" onClick={() => setOpen(true)}>
            <Plus />
          </Button>
        }
      />
      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="p-3">
          <p className="text-xs font-semibold text-muted">Média 7 dias</p>
          <p className="tabular font-display text-lg font-bold">
            {stats.avg7 !== null ? formatDuration(stats.avg7) : "—"}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs font-semibold text-muted">Média 30 dias</p>
          <p className="tabular font-display text-lg font-bold">
            {stats.avg30 !== null ? formatDuration(stats.avg30) : "—"}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs font-semibold text-muted">Regularidade</p>
          <p className="tabular font-display text-lg font-bold">
            {stats.regularity !== null ? `±${Math.round(stats.regularity)} min` : "—"}
          </p>
        </Card>
      </div>

      {chart.length > 1 && (
        <Card>
          <CardTitle className="mb-2">Duração efetiva</CardTitle>
          <SimpleLineChart
            data={chart}
            xKey="dia"
            lines={[{ key: "horas", name: "Horas", color: CHART.mineral }]}
            unit="h"
            title="Duração do sono"
            description={`${chart.length} noites registradas`}
            domain={[0, "auto"]}
          />
        </Card>
      )}

      {stats.nLonger >= 3 && stats.nShorter >= 3 && (
        <Card>
          <CardTitle>Padrão observado (exploratório)</CardTitle>
          <CardHint className="mt-1">
            Nas noites com 7 h ou mais, sua disposição média ao acordar foi{" "}
            {stats.energyLonger!.toFixed(1)}/5; nas mais curtas, {stats.energyShorter!.toFixed(1)}
            /5. É só uma observação dos seus registros — não indica causa.
          </CardHint>
        </Card>
      )}

      <p className="text-xs text-muted">
        O corpo também gasta energia dormindo, e esse período entra no cálculo do dia sem ser
        contado duas vezes. Dormir mais não significa, por si só, emagrecer mais.
      </p>

      {list.loading ? null : list.data.length === 0 ? (
        <EmptyState
          icon={Moon}
          title="Nenhuma noite registrada"
          text="Registre quando deitou e acordou. Sono fragmentado também conta."
          action={<Button onClick={() => setOpen(true)}>Registrar sono</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {list.data.map((s) => (
            <li key={s.id}>
              <Card className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="tabular font-semibold">{formatDuration(eff(s))}</p>
                  <p className="tabular text-xs text-muted">
                    {formatDateShort(localDateKey(Date.parse(s.started_at), tz))}{" "}
                    {formatTime(Date.parse(s.started_at), tz)} →{" "}
                    {formatTime(Date.parse(s.ended_at), tz)}
                    {s.awake_minutes ? ` · ${s.awake_minutes} min acordado` : ""}
                    {s.quality ? ` · qualidade ${s.quality}/5` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar"
                  onClick={() => {
                    setEditing(s);
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
                  onClick={() => setToDelete(s)}
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
        title={editing ? "Editar sono" : "Registrar sono"}
      >
        <SleepEditor key={editing?.id ?? "novo"} tz={tz} initial={editing} onSubmit={save} />
      </Sheet>
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir registro de sono?"
        description="O registro será apagado."
        confirmLabel="Excluir"
        danger
        onConfirm={async () => {
          if (store && toDelete) await store.remove("sleep_entries", toDelete.id);
          refresh();
        }}
      />
    </div>
  );
}

export default function SleepPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SleepInner />
    </Suspense>
  );
}
