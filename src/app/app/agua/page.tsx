"use client";

import { useMemo, useState } from "react";
import { Droplets, GlassWater, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { ProgressRing } from "@/components/leveza/ProgressRing";
import { SimpleBarChart, CHART } from "@/components/leveza/charts";
import { useAppData, useRecords } from "@/lib/data/provider";
import { addDays, dayRange, formatDateShort, formatTime, localDateKey } from "@/lib/dates";
import { fmtInt, todayKey } from "@/lib/utils";

export default function WaterPage() {
  const { tz, store, refresh, preferences } = useAppData();
  const today = todayKey(tz);
  const from = dayRange(addDays(today, -6), tz).start;
  const { end } = dayRange(today, tz);
  const list = useRecords("hydration_entries", {
    from: new Date(from).toISOString(),
    to: new Date(end).toISOString(),
  });
  const [custom, setCustom] = useState("");
  const [goalEdit, setGoalEdit] = useState<string | null>(null);
  const goal = preferences?.water_goal_ml ?? 2000;
  const cups = preferences?.cup_sizes_ml?.length ? preferences.cup_sizes_ml : [200, 300, 500];

  const todayRows = list.data.filter((w) => localDateKey(Date.parse(w.drank_at), tz) === today);
  const total = todayRows.reduce((s, w) => s + w.volume_ml, 0);
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const k = addDays(today, i - 6);
        return {
          dia: formatDateShort(k),
          ml: list.data
            .filter((w) => localDateKey(Date.parse(w.drank_at), tz) === k)
            .reduce((s, w) => s + w.volume_ml, 0),
        };
      }),
    [list.data, today, tz],
  );

  async function add(ml: number) {
    if (!store || !(ml > 0 && ml <= 2000)) return;
    await store.insert("hydration_entries", {
      drank_at: new Date().toISOString(),
      volume_ml: Math.round(ml),
    });
    refresh();
  }

  async function saveGoal() {
    if (!store || !preferences || goalEdit === null) return;
    const g = Math.round(Number(goalEdit));
    if (!(g >= 500 && g <= 5000)) return;
    const { id: _i, user_id: _u, created_at: _c, updated_at: _up, ...rest } = preferences;
    void _i;
    void _u;
    void _c;
    void _up;
    await store.upsertSingle("user_preferences", { ...rest, water_goal_ml: g });
    setGoalEdit(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Água" back="/app" />
      <Card className="flex flex-col items-center gap-4">
        <ProgressRing
          value={total / goal}
          label="Hidratação em relação à meta"
          color="var(--brand-mineral)"
        >
          <span className="tabular font-display text-2xl font-bold">{fmtInt(total)}</span>
          <span className="text-xs text-muted">de {fmtInt(goal)} ml</span>
        </ProgressRing>
        <div className="grid w-full grid-cols-3 gap-2">
          {cups.map((c) => (
            <Button key={c} variant="secondary" onClick={() => add(c)}>
              <GlassWater /> {c} ml
            </Button>
          ))}
        </div>
        <div className="flex w-full items-end gap-2">
          <Field label="Outro volume (ml)" className="flex-1">
            {({ id }) => (
              <Input
                id={id}
                inputMode="numeric"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            )}
          </Field>
          <Button
            onClick={() => {
              add(Number(custom));
              setCustom("");
            }}
            disabled={!(Number(custom) > 0)}
          >
            Adicionar
          </Button>
        </div>
        {total > 4000 && (
          <p
            role="note"
            className="w-full rounded-xl bg-orange-soft px-3 py-2 text-sm text-orange-ink"
          >
            Você já registrou bastante água hoje. Beber muito além da sede não traz benefício extra;
            em excesso, pode fazer mal.
          </p>
        )}
      </Card>

      <Card>
        <CardTitle className="mb-2">Últimos 7 dias</CardTitle>
        <SimpleBarChart
          data={week}
          xKey="dia"
          bars={[{ key: "ml", name: "Água", color: CHART.mineral }]}
          unit="ml"
          title="Água por dia"
          description={week.map((w) => `${w.dia}: ${w.ml} ml`).join("; ")}
        />
      </Card>

      <Card className="space-y-2">
        <CardTitle>Meta diária</CardTitle>
        <CardHint>
          Não existe uma meta universal: a necessidade muda com clima, atividade, alimentação e
          saúde. Ajuste para o que faz sentido para você ou para o que seu profissional orientou.
        </CardHint>
        {goalEdit === null ? (
          <Button variant="outline" onClick={() => setGoalEdit(String(goal))}>
            Ajustar meta ({fmtInt(goal)} ml)
          </Button>
        ) : (
          <div className="flex items-end gap-2">
            <Field label="Meta (ml)" className="flex-1" hint="Entre 500 e 5.000 ml.">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  inputMode="numeric"
                  value={goalEdit}
                  onChange={(e) => setGoalEdit(e.target.value)}
                />
              )}
            </Field>
            <Button onClick={saveGoal}>Salvar</Button>
          </div>
        )}
      </Card>

      <section aria-label="Registros de hoje">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-muted">
          Hoje
        </h2>
        {todayRows.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Droplets className="size-4" aria-hidden /> Nenhum registro hoje.
          </p>
        ) : (
          <ul className="space-y-1">
            {todayRows.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-xl bg-card px-3 py-1 text-sm"
              >
                <span className="tabular">
                  {formatTime(Date.parse(w.drank_at), tz)} · {w.volume_ml} ml
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir ${w.volume_ml} ml`}
                  className="text-error"
                  onClick={async () => {
                    await store?.remove("hydration_entries", w.id);
                    refresh();
                  }}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
