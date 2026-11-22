/**
 * Gasto energético estimado da amamentação.
 *
 * A produção de leite consome energia; a literatura indica algo em torno de 500 kcal/dia na
 * amamentação exclusiva, com grande variação individual (idade do bebê, volume de leite,
 * composição corporal, amamentação exclusiva ou parcial). Por isso usamos FAIXAS e um valor
 * central, e mostramos sempre que é uma estimativa. Isso entra no GASTO estimado — nunca vira
 * meta de restrição nem “permissão” para comer menos.
 * Referência: NASEM/IOM, Dietary Reference Intakes for Energy (2023).
 */

export type BreastfeedingPattern = "exclusiva" | "parcial" | "nao_informado";

export const LACTATION_COST_RANGE: Record<BreastfeedingPattern, [number, number]> = {
  exclusiva: [300, 600],
  parcial: [100, 400],
  nao_informado: [100, 600],
};

export const BREASTFEEDING_PATTERN_LABELS: Record<BreastfeedingPattern, string> = {
  exclusiva: "Exclusiva",
  parcial: "Parcial",
  nao_informado: "Prefiro não dizer",
};

export interface LactationCost {
  kcal: number;
  low: number;
  high: number;
  pattern: BreastfeedingPattern;
}

/** Custo diário estimado (kcal/dia): valor central e faixa. */
export function lactationCost(pattern: BreastfeedingPattern | null | undefined): LactationCost {
  const p = pattern ?? "nao_informado";
  const [low, high] = LACTATION_COST_RANGE[p];
  return { kcal: (low + high) / 2, low, high, pattern: p };
}
