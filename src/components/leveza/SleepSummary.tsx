"use client";

import Link from "next/link";
import { BedDouble, ChartColumn, ChevronRight, MoonStar } from "lucide-react";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useAppData, useRecords } from "@/lib/data/provider";
import { addDays, dayRange, formatDuration } from "@/lib/dates";
import { effectiveSleepMinutes } from "@/lib/calc/sleep";
import type { SleepEntry } from "@/lib/data/types";
import { todayKey } from "@/lib/utils";

const QUALITY: Record<number, string> = {
  1: "Ruim",
  2: "Regular",
  3: "Ok",
  4: "Boa",
  5: "Ótima",
};

const eff = (s: SleepEntry) =>
  effectiveSleepMinutes({
    start: Date.parse(s.started_at),
    end: Date.parse(s.ended_at),
    awakeMinutes: s.awake_minutes,
  });

/** Resumo do sono no estilo do cartão “Sono” da tela Movimento e Sono. */
export function SleepSummary() {
  const { tz } = useAppData();
  const today = todayKey(tz);
  const from = dayRange(addDays(today, -6), tz).start;
  const list = useRecords("sleep_entries", { from: new Date(from).toISOString() });

  const { last, avg } = useMemo(() => {
    const sorted = [...list.data].sort((a, b) => b.ended_at.localeCompare(a.ended_at));
    const avg = sorted.length ? sorted.reduce((t, s) => t + eff(s), 0) / sorted.length : null;
    return { last: sorted[0] ?? null, avg };
  }, [list.data]);

  return (
    <Card className="p-0">
      <h2 className="flex items-center gap-2 px-4 pt-4 font-display text-lg font-bold text-ink">
        <MoonStar className="size-6 text-forest" aria-hidden /> Sono
      </h2>
      <Link
        href="/app/sono"
        className="mx-2 mt-2 flex min-h-12 items-center gap-3 rounded-2xl px-2 font-semibold text-ink hover:bg-sage-soft/60"
      >
        <BedDouble className="size-5 text-forest" aria-hidden />
        <span className="flex-1">Registro de sono</span>
        <ChevronRight className="size-5 text-muted" aria-hidden />
      </Link>
      <div className="mx-4 border-t border-line py-3">
        <p className="text-sm text-muted">Última noite</p>
        <div className="flex items-center gap-3">
          <p className="tabular font-display text-2xl font-bold text-ink">
            {last ? formatDuration(eff(last)) : "—"}
          </p>
          {last?.quality ? (
            <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-xs font-semibold text-forest">
              {QUALITY[last.quality]}
            </span>
          ) : null}
          <ChartColumn className="ml-auto size-6 text-forest" aria-hidden />
        </div>
      </div>
      <div className="mx-4 border-t border-line pb-4 pt-3">
        <p className="text-sm text-muted">Média da semana</p>
        <div className="flex items-center">
          <p className="tabular font-display text-xl font-bold text-ink">
            {avg !== null ? formatDuration(avg) : "—"}
          </p>
          <ChartColumn className="ml-auto size-6 text-forest" aria-hidden />
        </div>
      </div>
    </Card>
  );
}
