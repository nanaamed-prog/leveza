"use client";

import { useState } from "react";
import { useAppData } from "@/lib/data/provider";
import {
  BREASTFEEDING_PATTERN_LABELS,
  lactationCost,
  type BreastfeedingPattern,
} from "@/lib/calc/lactation";
import { fmtInt } from "@/lib/utils";

/** Escolha do padrão de amamentação: ajusta a estimativa do gasto de energia do dia. */
export function BreastfeedingPatternPicker() {
  const { store, profile, refresh } = useAppData();
  const [pattern, setPattern] = useState<BreastfeedingPattern>(
    profile?.breastfeeding_pattern ?? "nao_informado",
  );
  const cost = lactationCost(pattern);

  async function choose(p: BreastfeedingPattern) {
    setPattern(p);
    if (!store || !profile) return;
    const { id: _i, user_id: _u, created_at: _c, updated_at: _up, ...rest } = profile;
    void _i;
    void _u;
    void _c;
    void _up;
    await store.upsertSingle("profiles", { ...rest, breastfeeding_pattern: p });
    refresh();
  }

  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Padrão de amamentação" className="grid grid-cols-3 gap-2">
        {(Object.keys(BREASTFEEDING_PATTERN_LABELS) as BreastfeedingPattern[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={pattern === k}
            onClick={() => choose(k)}
            className={`min-h-11 rounded-xl border px-2 text-xs font-semibold ${pattern === k ? "border-forest bg-forest text-white" : "border-line bg-card text-ink"}`}
          >
            {BREASTFEEDING_PATTERN_LABELS[k]}
          </button>
        ))}
      </div>
      <p className="tabular text-xs text-muted">
        Estimativa usada no seu gasto do dia: cerca de {fmtInt(cost.kcal)} kcal (faixa de{" "}
        {fmtInt(cost.low)} a {fmtInt(cost.high)} kcal). Varia muito de pessoa para pessoa e não é
        uma meta de quanto comer.
      </p>
    </div>
  );
}
