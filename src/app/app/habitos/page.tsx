"use client";

import { useMemo, useState } from "react";
import { Check, Minus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { SimpleBarChart, CHART } from "@/components/leveza/charts";
import { useAppData, useRecords } from "@/lib/data/provider";
import { addDays, formatDateShort, startOfWeek } from "@/lib/dates";
import { CORE_HABITS, MILK_NOTE, OPTIONAL_HABITS, SUBSTITUTIONS } from "@/lib/habits";
import type { HabitCheckin } from "@/lib/data/types";
import { todayKey, cn } from "@/lib/utils";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function HabitsPage() {
  const { tz, store, refresh, profile, preferences } = useAppData();
  const today = todayKey(tz);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(today, profile?.week_starts_on ?? 1),
  );
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const checks = useRecords("habit_checkins", {
    from: addDays(weekStart, -21),
    to: addDays(weekStart, 7),
  });
  const chosen = preferences?.plan52_goals ?? [];
  const habits = [...CORE_HABITS, ...OPTIONAL_HABITS.filter((h) => chosen.includes(h.key))];

  const find = (d: string, k: string) => checks.data.find((c) => c.date === d && c.habit_key === k);

  async function cycle(d: string, k: string) {
    if (!store) return;
    const cur = find(d, k);
    const next: HabitCheckin["status"] | null = !cur
      ? "feito"
      : cur.status === "feito"
        ? "parcial"
        : null;
    if (cur && next) await store.update("habit_checkins", cur.id, { status: next });
    else if (cur) await store.remove("habit_checkins", cur.id);
    else await store.insert("habit_checkins", { date: d, habit_key: k, status: "feito" });
    refresh();
  }

  async function toggleOptional(k: string, on: boolean) {
    if (!store || !preferences) return;
    const { id: _i, user_id: _u, created_at: _c, updated_at: _up, ...rest } = preferences;
    void _i;
    void _u;
    void _c;
    void _up;
    await store.upsertSingle("user_preferences", {
      ...rest,
      plan52_goals: on ? [...chosen, k] : chosen.filter((x) => x !== k),
    });
    refresh();
  }

  const consistency = useMemo(() => {
    return Array.from({ length: 4 }, (_, w) => {
      const ws = addDays(weekStart, (w - 3) * 7);
      const wd = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
      const done = checks.data
        .filter((c) => wd.includes(c.date))
        .reduce((s, c) => s + (c.status === "feito" ? 1 : 0.5), 0);
      const possible = CORE_HABITS.length * 5;
      return {
        semana: formatDateShort(ws),
        pct: Math.min(100, Math.round((done / possible) * 100)),
      };
    });
  }, [checks.data, weekStart]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Plano 5+2"
        subtitle="Cinco dias de prioridade, dois de flexibilidade. Sem culpa, sem “dia do lixo”."
        back="/app"
      />
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ← Anterior
          </Button>
          <span className="font-display text-sm font-semibold">
            Semana de {formatDateShort(weekStart)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={addDays(weekStart, 7) > today}
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            Próxima →
          </Button>
        </div>
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[480px] border-separate border-spacing-1 text-xs">
            <caption className="sr-only">
              Hábitos da semana. Toque para alternar entre feito, parcial e vazio.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="text-left font-semibold text-muted">
                  Hábito
                </th>
                {days.map((d, i) => {
                  const dow = new Date(d + "T12:00:00Z").getUTCDay();
                  const flex = i >= 5;
                  return (
                    <th
                      key={d}
                      scope="col"
                      className={cn("w-11 font-semibold", flex ? "text-orange-ink" : "text-muted")}
                    >
                      {DOW[dow]}
                      <span className="block font-normal">{flex ? "flex" : d.slice(8)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => (
                <tr key={h.key}>
                  <th scope="row" className="pr-1 text-left font-normal text-ink">
                    {h.label}
                  </th>
                  {days.map((d, i) => {
                    const c = find(d, h.key);
                    const future = d > today;
                    return (
                      <td key={d}>
                        <button
                          type="button"
                          disabled={future}
                          onClick={() => cycle(d, h.key)}
                          aria-label={`${h.label}, ${formatDateShort(d)}: ${c ? (c.status === "feito" ? "feito" : "parcial") : "não marcado"}`}
                          className={cn(
                            "flex size-11 items-center justify-center rounded-[12px] border disabled:opacity-30",
                            c?.status === "feito"
                              ? "border-forest bg-forest text-white"
                              : c?.status === "parcial"
                                ? "border-sage bg-sage-soft text-forest"
                                : i >= 5
                                  ? "border-dashed border-orange/50 bg-card"
                                  : "border-line bg-card",
                          )}
                        >
                          {c?.status === "feito" ? (
                            <Check className="size-4" />
                          ) : c?.status === "parcial" ? (
                            <Minus className="size-4" />
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          ✓ feito · – parcial. Nos dias flexíveis, aproveite sem regras rígidas — não é para
          “compensar” nada.
        </p>
      </Card>

      <Card>
        <CardTitle className="mb-2">Consistência (dias de prioridade)</CardTitle>
        <SimpleBarChart
          data={consistency}
          xKey="semana"
          bars={[{ key: "pct", name: "Consistência", color: CHART.forest }]}
          unit="%"
          title="Consistência semanal"
          description={consistency.map((c) => `semana ${c.semana}: ${c.pct}%`).join("; ")}
        />
      </Card>

      <Card className="space-y-2">
        <CardTitle>Metas opcionais</CardTitle>
        <CardHint>Escolha só o que fizer sentido para você agora.</CardHint>
        {OPTIONAL_HABITS.map((h) => (
          <Checkbox
            key={h.key}
            checked={chosen.includes(h.key)}
            onChange={(v) => toggleOptional(h.key, v)}
            label={h.label}
            description={h.key === "leite_ajuste" ? MILK_NOTE : undefined}
          />
        ))}
      </Card>

      <Card>
        <CardTitle>Trocas acessíveis</CardTitle>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {SUBSTITUTIONS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
