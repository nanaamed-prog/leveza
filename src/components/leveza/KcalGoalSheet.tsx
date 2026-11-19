"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { useAppData } from "@/lib/data/provider";
import { kcalTargetFloor, KCAL_TARGET_MAX, suggestIntakeTarget } from "@/lib/calc/weight";
import { fmtInt } from "@/lib/utils";

/** Editar a meta diária de calorias (usada no anel do início). */
export function KcalGoalSheet({
  open,
  onOpenChange,
  projectedExpenditure,
  bmrKcal,
  bmrLow,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectedExpenditure: number | null;
  bmrKcal: number | null;
  bmrLow: number | null;
}) {
  const { goal, store, refresh, eligibility } = useAppData();
  const [value, setValue] = useState(() => (goal?.kcal_target ? String(goal.kcal_target) : ""));
  const [error, setError] = useState<string | null>(null);
  const deficitAllowed = eligibility.calorieDeficit.allowed;
  const floor = kcalTargetFloor({ deficitAllowed, bmrLow, projectedExpenditure });
  const suggestion = projectedExpenditure
    ? suggestIntakeTarget({
        goal: goal?.type === "habitos" || !goal ? "manter" : goal.type,
        projectedExpenditure,
        bmr: bmrKcal,
        deficitAllowed,
      })
    : null;

  async function save(kcal: number | null) {
    if (!store) return;
    if (kcal !== null && (!(kcal >= floor) || kcal > KCAL_TARGET_MAX)) {
      setError(
        deficitAllowed
          ? `Use um valor entre ${fmtInt(floor)} e ${fmtInt(KCAL_TARGET_MAX)} kcal. Metas abaixo disso só com acompanhamento profissional.`
          : `No seu perfil, a meta não pode ficar abaixo do gasto estimado (${fmtInt(floor)} kcal), para não virar uma meta restritiva.`,
      );
      return;
    }
    setError(null);
    try {
      if (goal) await store.update("goals", goal.id, { kcal_target: kcal });
      else
        await store.insert("goals", {
          type: "habitos",
          target_weight_kg: null,
          kcal_target: kcal,
          weekly_rate_kg: null,
          status: "ativa",
        });
      refresh();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  const n = Number(value.replace(/\D/g, ""));
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Meta diária de calorias"
      description="Quanto você quer consumir por dia. Você pode mudar quando quiser."
    >
      <div className="space-y-3">
        <Field
          label="Meta (kcal por dia)"
          hint={`Mínimo para o seu perfil: ${fmtInt(floor)} kcal.`}
          error={error ?? undefined}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              inputMode="numeric"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              placeholder="Ex.: 1800"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
        </Field>
        <div className="flex flex-wrap gap-2">
          {[-100, +100].map((d) => (
            <Button
              key={d}
              variant="outline"
              size="sm"
              onClick={() => setValue(String(Math.max(0, (n || floor) + d)))}
            >
              {d > 0 ? "+100" : "−100"}
            </Button>
          ))}
          {suggestion && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setValue(String(Math.max(suggestion.kcal, floor)))}
            >
              Sugestão: {fmtInt(Math.max(suggestion.kcal, floor))} kcal
            </Button>
          )}
        </div>
        {projectedExpenditure ? (
          <p className="tabular text-xs text-muted">
            Seu gasto estimado hoje: ≈ {fmtInt(projectedExpenditure)} kcal.
          </p>
        ) : null}
        <Button block size="lg" onClick={() => save(n || null)} disabled={!n}>
          Salvar meta
        </Button>
        {goal?.kcal_target ? (
          <Button variant="ghost" block onClick={() => save(null)}>
            Remover meta
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
