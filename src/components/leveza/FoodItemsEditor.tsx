"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { FOODS } from "@/lib/nutrition/foods";
import { rescale, type DraftItem } from "@/lib/nutrition/draft";
import { macroBreakdown, MACRO_LABELS } from "@/lib/calc/macros";
import { fmt1, fmtInt } from "@/lib/utils";

const CONF_LABEL = {
  alta: "Confiança alta",
  media: "Confiança média",
  baixa: "Confiança baixa",
  informado: "Informado por você",
} as const;
const CONF_TONE = {
  alta: "forest",
  media: "orange",
  baixa: "error",
  informado: "neutral",
} as const;

export function FoodItemsEditor({
  items,
  onChange,
}: {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
}) {
  const update = (key: string, fn: (d: DraftItem) => DraftItem) =>
    onChange(items.map((d) => (d.key === key ? fn(d) : d)));
  return (
    <ul className="space-y-3">
      {items.map((d) => {
        const ref = d.refId ? FOODS.find((f) => f.id === d.refId) : null;
        const b = macroBreakdown({ proteinG: d.protein_g, carbsG: d.carbs_g, fatG: d.fat_g });
        return (
          <li key={d.key} className="rounded-card border border-line bg-card p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor={`${d.key}-name`}>
                  Nome do alimento
                </label>
                <Input
                  id={`${d.key}-name`}
                  value={d.name}
                  onChange={(e) =>
                    update(d.key, (x) => ({ ...x, name: e.target.value, edited: true }))
                  }
                  className="font-semibold"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remover ${d.name}`}
                onClick={() => onChange(items.filter((x) => x.key !== d.key))}
              >
                <Trash2 />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={CONF_TONE[d.confidence]}>{CONF_LABEL[d.confidence]}</Badge>
              {d.preparation && <Badge>{d.preparation}</Badge>}
              {b.predominant && (
                <Badge tone="neutral">
                  Predomínio: {MACRO_LABELS[b.predominant].toLowerCase()}
                </Badge>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor={`${d.key}-g`} className="text-xs font-semibold text-muted">
                  Porção ({d.unit === "ml" ? "ml" : "g"})
                </label>
                <Input
                  id={`${d.key}-g`}
                  inputMode="decimal"
                  value={String(Math.round(d.grams * 10) / 10)}
                  onChange={(e) => {
                    const g = Number(e.target.value.replace(",", "."));
                    if (Number.isFinite(g) && g >= 0 && g <= 5000)
                      update(d.key, (x) => rescale(x, g, ref));
                  }}
                />
                {ref && ref.portions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ref.portions.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => update(d.key, (x) => rescale(x, p.grams, ref))}
                        className="min-h-8 rounded-full border border-line px-2 text-[0.7rem] font-semibold text-forest"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor={`${d.key}-kcal`} className="text-xs font-semibold text-muted">
                  Energia (kcal)
                </label>
                <Input
                  id={`${d.key}-kcal`}
                  inputMode="decimal"
                  value={String(Math.round(d.kcal))}
                  disabled={Boolean(ref)}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(",", "."));
                    if (Number.isFinite(v) && v >= 0)
                      update(d.key, (x) => ({ ...x, kcal: v, edited: true }));
                  }}
                />
              </div>
            </div>
            {!ref && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["protein_g", "carbs_g", "fat_g"] as const).map((k) => (
                  <div key={k}>
                    <label htmlFor={`${d.key}-${k}`} className="text-xs font-semibold text-muted">
                      {k === "protein_g"
                        ? "Proteínas"
                        : k === "carbs_g"
                          ? "Carboidratos"
                          : "Gorduras"}{" "}
                      (g)
                    </label>
                    <Input
                      id={`${d.key}-${k}`}
                      inputMode="decimal"
                      value={String(Math.round(d[k] * 10) / 10)}
                      onChange={(e) => {
                        const v = Number(e.target.value.replace(",", "."));
                        if (Number.isFinite(v) && v >= 0)
                          update(d.key, (x) => ({ ...x, [k]: v, edited: true }));
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            <p className="tabular mt-2 text-xs text-muted">
              {fmtInt(d.kcal)} kcal · P {fmt1(d.protein_g)} g · C {fmt1(d.carbs_g)} g · G{" "}
              {fmt1(d.fat_g)} g{d.fiber_g !== null ? ` · fibras ${fmt1(d.fiber_g)} g` : ""} · Fonte:{" "}
              {d.nutrition_source}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
