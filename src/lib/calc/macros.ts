/**
 * Macronutrientes.
 * kcal proteína = g × 4; carboidrato = g × 4; gordura = g × 9 (fatores gerais de Atwater).
 * Percentual = kcal do macro ÷ soma das kcal dos três macros × 100.
 *
 * A soma dos três macros pode diferir do "valor energético total" informado por tabelas porque:
 * fibras (≈2 kcal/g ou não contabilizadas), álcool (7 kcal/g), polióis, fatores específicos
 * de cada alimento e arredondamentos. Por isso nunca inventamos percentuais quando faltam dados.
 */

export interface Macros {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

export type MacroKey = "protein" | "carbs" | "fat";

export const MACRO_LABELS: Record<MacroKey, string> = {
  protein: "Proteínas",
  carbs: "Carboidratos",
  fat: "Gorduras",
};

export interface MacroBreakdown {
  kcal: Record<MacroKey, number>;
  totalKcalFromMacros: number;
  /** null quando não há energia vinda de macros (evita dividir por zero ou inventar números). */
  percent: Record<MacroKey, number> | null;
  /** Macronutriente com maior contribuição energética; null se não houver dados ou houver empate total. */
  predominant: MacroKey | null;
}

function safe(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function macroBreakdown(m: Macros): MacroBreakdown {
  const kcal = {
    protein: safe(m.proteinG) * KCAL_PER_G.protein,
    carbs: safe(m.carbsG) * KCAL_PER_G.carbs,
    fat: safe(m.fatG) * KCAL_PER_G.fat,
  };
  const total = kcal.protein + kcal.carbs + kcal.fat;
  if (total <= 0) return { kcal, totalKcalFromMacros: 0, percent: null, predominant: null };

  const percent = {
    protein: (kcal.protein / total) * 100,
    carbs: (kcal.carbs / total) * 100,
    fat: (kcal.fat / total) * 100,
  };
  const entries = Object.entries(kcal) as [MacroKey, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const first = entries[0]!;
  const second = entries[1]!;
  const predominant = Math.abs(first[1] - second[1]) < 1e-9 ? null : first[0];
  return { kcal, totalKcalFromMacros: total, percent, predominant };
}

/**
 * Arredonda percentuais para inteiros mantendo soma 100 (método do maior resto).
 * Útil para exibição; o cálculo interno usa valores exatos.
 */
export function roundPercentages(p: Record<MacroKey, number>): Record<MacroKey, number> {
  const keys: MacroKey[] = ["protein", "carbs", "fat"];
  const floors = keys.map((k) => Math.floor(p[k]));
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  const order = keys
    .map((k, i) => ({ i, frac: p[k] - Math.floor(p[k]) }))
    .sort((a, b) => b.frac - a.frac);
  for (const o of order) {
    if (rest <= 0) break;
    floors[o.i]! += 1;
    rest -= 1;
  }
  return { protein: floors[0]!, carbs: floors[1]!, fat: floors[2]! };
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (acc, it) => ({
      proteinG: acc.proteinG + safe(it.proteinG),
      carbsG: acc.carbsG + safe(it.carbsG),
      fatG: acc.fatG + safe(it.fatG),
    }),
    { proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

/** Escala valores por 100 g para uma porção. */
export function scalePer100g<T extends Record<string, number | null | undefined>>(
  per100: T,
  grams: number,
): { [K in keyof T]: number | null } {
  const factor = safe(grams) / 100;
  const out = {} as { [K in keyof T]: number | null };
  for (const key of Object.keys(per100) as (keyof T)[]) {
    const v = per100[key];
    out[key] = typeof v === "number" && Number.isFinite(v) ? v * factor : null;
  }
  return out;
}
