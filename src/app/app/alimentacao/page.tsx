"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Camera, Copy, Pencil, Plus, Trash2, Utensils } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DayNav } from "@/components/leveza/DayNav";
import { useDailyReport } from "@/lib/data/useDailyReport";
import { formatDateShort } from "@/lib/dates";
import { macroBreakdown, roundPercentages } from "@/lib/calc/macros";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/leveza/EmptyState";
import { MacroRing } from "@/components/leveza/MacroRing";
import { Badge } from "@/components/ui/badge";
import { SignedPhoto } from "@/components/leveza/SignedPhoto";
import { useAppData, useRecords } from "@/lib/data/provider";
import { MEAL_LABELS, type FoodEntry, type Meal } from "@/lib/data/types";
import { dayRange, formatTime } from "@/lib/dates";
import { sumMacros } from "@/lib/calc/macros";
import { fmtInt, todayKey } from "@/lib/utils";

export default function FoodPage() {
  const { tz, store, refresh } = useAppData();
  const today = todayKey(tz);
  const [day, setDay] = useState(today);
  const [view, setView] = useState<"hoje" | "semana" | "mes">("hoje");
  const { start, end } = useMemo(() => dayRange(day, tz), [day, tz]);
  const entries = useRecords("food_entries", {
    from: new Date(start).toISOString(),
    to: new Date(end).toISOString(),
    order: "asc",
  });
  const items = useRecords("food_items", {
    in: { field: "food_entry_id", values: entries.data.map((e) => e.id) },
    order: "asc",
  });
  const [toDelete, setToDelete] = useState<FoodEntry | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const total = entries.data.reduce((s, e) => s + e.total_kcal, 0);
  const macros = sumMacros(
    items.data.map((i) => ({ proteinG: i.protein_g, carbsG: i.carbs_g, fatG: i.fat_g })),
  );
  const byMeal = (Object.keys(MEAL_LABELS) as Meal[]).map((m) => ({
    meal: m,
    entries: entries.data.filter((e) => e.meal === m),
  }));

  async function duplicate(e: FoodEntry) {
    if (!store) return;
    const its = items.data.filter((i) => i.food_entry_id === e.id);
    const copy = await store.insert("food_entries", {
      eaten_at: new Date().toISOString(),
      meal: e.meal,
      photo_path: null,
      source: e.source,
      total_kcal: e.total_kcal,
      notes: e.notes,
    });
    await store.insertMany(
      "food_items",
      its.map(({ id: _i, user_id: _u, created_at: _c, updated_at: _up, ...rest }) => {
        void _i;
        void _u;
        void _c;
        void _up;
        return { ...rest, food_entry_id: copy.id };
      }),
    );
    setMsg("Refeição duplicada para agora.");
    setDay(today);
    refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Alimentação"
        action={
          <Button asChild size="icon" aria-label="Nova refeição">
            <Link href="/app/alimentacao/nova">
              <Plus />
            </Link>
          </Button>
        }
      />
      <div
        role="tablist"
        aria-label="Período"
        className="grid grid-cols-3 gap-1 rounded-full bg-line/60 p-1"
      >
        {(
          [
            ["hoje", "Hoje"],
            ["semana", "Semana"],
            ["mes", "Mês"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={view === k}
            onClick={() => setView(k)}
            className={`min-h-10 rounded-full text-sm font-semibold ${view === k ? "bg-forest text-white" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view !== "hoje" ? (
        <PeriodSummary
          days={view === "semana" ? 7 : 30}
          onPick={(d) => {
            setDay(d);
            setView("hoje");
          }}
        />
      ) : (
        <>
          <DayNav value={day} onChange={setDay} today={today} />

          <Card>
            <div className="mb-3 flex items-baseline justify-between">
              <CardTitle>Total do dia</CardTitle>
              <span className="tabular font-display text-xl font-bold text-forest">
                {fmtInt(total)} kcal
              </span>
            </div>
            <MacroRing macros={macros} />
            <p className="mt-3 text-xs text-muted">
              Percentuais calculados sobre a energia dos três macros (proteína e carboidrato 4
              kcal/g; gordura 9 kcal/g). Podem diferir do total por fibras, álcool e
              arredondamentos.
            </p>
          </Card>

          {msg && (
            <p role="status" className="rounded-xl bg-sage-soft px-3 py-2 text-sm text-forest">
              {msg}
            </p>
          )}

          {!entries.loading && entries.data.length === 0 ? (
            <EmptyState
              icon={Utensils}
              title="Nenhuma refeição neste dia"
              text="Registre por foto ou buscando os alimentos."
              action={
                <div className="flex gap-2">
                  <Button asChild>
                    <Link href="/app/alimentacao/nova?modo=foto">
                      <Camera /> Foto
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/app/alimentacao/nova">
                      <Plus /> Manual
                    </Link>
                  </Button>
                </div>
              }
            />
          ) : (
            byMeal
              .filter((g) => g.entries.length > 0)
              .map((g) => (
                <section key={g.meal} aria-label={MEAL_LABELS[g.meal]} className="space-y-2">
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
                    {MEAL_LABELS[g.meal]}
                  </h2>
                  {g.entries.map((e) => {
                    const its = items.data.filter((i) => i.food_entry_id === e.id);
                    return (
                      <Card key={e.id} className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="tabular text-sm text-muted">
                            {formatTime(Date.parse(e.eaten_at), tz)}
                          </span>
                          {e.source === "foto_ia" && <Badge tone="orange">Foto + revisão</Badge>}
                          <span className="tabular ml-auto font-display font-bold text-ink">
                            {fmtInt(e.total_kcal)} kcal
                          </span>
                        </div>
                        {e.photo_path && store?.kind === "supabase" && (
                          <div className="mt-2">
                            <SignedPhoto
                              path={e.photo_path}
                              alt={`Foto da refeição ${MEAL_LABELS[e.meal]}`}
                            />
                          </div>
                        )}
                        <ul className="mt-2 space-y-0.5 text-sm text-ink">
                          {its.map((i) => (
                            <li key={i.id} className="flex justify-between gap-2">
                              <span className="truncate">
                                {i.name}{" "}
                                <span className="text-muted">
                                  · {fmtInt(i.grams)} {i.unit === "ml" ? "ml" : "g"}
                                </span>
                              </span>
                              <span className="tabular text-muted">{fmtInt(i.kcal)}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex justify-end gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/app/alimentacao/nova?entrada=${e.id}`}>
                              <Pencil /> Editar
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => duplicate(e)}>
                            <Copy /> Duplicar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error"
                            onClick={() => setToDelete(e)}
                          >
                            <Trash2 /> Excluir
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </section>
              ))
          )}
        </>
      )}

      <ConfirmationDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir refeição?"
        description="Esta refeição e seus itens serão apagados."
        confirmLabel="Excluir"
        danger
        onConfirm={async () => {
          if (!store || !toDelete) return;
          if (toDelete.photo_path && store.kind === "supabase") {
            const { getSupabase } = await import("@/lib/supabase/client");
            await getSupabase()!.storage.from("food-photos").remove([toDelete.photo_path]);
          }
          await store.remove("food_entries", toDelete.id);
          refresh();
        }}
      />
    </div>
  );
}

function PeriodSummary({ days, onPick }: { days: number; onPick: (d: string) => void }) {
  const { rows, loading } = useDailyReport(days);
  const withMeals = rows.filter((r) => r.consumed > 0);
  const total = withMeals.reduce((t, r) => t + r.consumed, 0);
  const macros = withMeals.reduce(
    (t, r) => ({
      proteinG: t.proteinG + r.protein,
      carbsG: t.carbsG + r.carbs,
      fatG: t.fatG + r.fat,
    }),
    { proteinG: 0, carbsG: 0, fatG: 0 },
  );
  const pct = macroBreakdown(macros).percent;
  const rp = pct ? roundPercentages(pct) : null;
  if (loading) return null;
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle>{days === 7 ? "Últimos 7 dias" : "Últimos 30 dias"}</CardTitle>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-canvas p-2">
            <p className="text-xs text-muted">Média por dia registrado</p>
            <p className="tabular font-display text-lg font-bold">
              {withMeals.length ? fmtInt(total / withMeals.length) : "—"} kcal
            </p>
          </div>
          <div className="rounded-xl bg-canvas p-2">
            <p className="text-xs text-muted">Dias com registro</p>
            <p className="tabular font-display text-lg font-bold">
              {withMeals.length}/{days}
            </p>
          </div>
        </div>
        {rp && (
          <p className="tabular mt-2 text-center text-xs text-muted">
            Proteínas {rp.protein}% · Carboidratos {rp.carbs}% · Gorduras {rp.fat}% da energia
          </p>
        )}
      </Card>
      <ul className="space-y-1.5">
        {[...rows].reverse().map((r) => (
          <li key={r.date}>
            <button
              type="button"
              onClick={() => onPick(r.date)}
              className="flex min-h-12 w-full items-center justify-between rounded-xl border border-line bg-card px-3 text-left text-sm"
            >
              <span className="font-semibold">{formatDateShort(r.date)}</span>
              <span className="tabular text-muted">
                {r.consumed > 0 ? `${fmtInt(r.consumed)} kcal` : "sem registro"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
