/**
 * IMC (Índice de Massa Corporal) para ADULTOS.
 * Fórmula: peso_kg / (altura_m * altura_m).
 * É um indicador de triagem populacional — não é diagnóstico nem mede composição corporal.
 * Categorias adultas (OMS). NÃO aplicar a menores de 18 anos (usar curvas por idade, fora do escopo).
 */

export type BmiCategory = "baixo_peso" | "saudavel" | "sobrepeso" | "obesidade";

export interface BmiResult {
  value: number;
  /** Valor arredondado para 1 casa, para exibição. */
  display: string;
  category: BmiCategory;
  label: string;
  /** Subclasse opcional de obesidade (I, II, III). */
  obesityClass?: 1 | 2 | 3;
}

export const BMI_LABELS: Record<BmiCategory, string> = {
  baixo_peso: "Baixo peso",
  saudavel: "Faixa de peso saudável",
  sobrepeso: "Sobrepeso",
  obesidade: "Obesidade",
};

export class BmiInputError extends Error {}

export function calculateBmi(weightKg: number, heightCm: number, ageYears: number): BmiResult {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
    throw new BmiInputError("Peso inválido.");
  }
  if (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 260) {
    throw new BmiInputError("Altura inválida.");
  }
  if (!Number.isFinite(ageYears) || ageYears < 18) {
    throw new BmiInputError("As categorias de IMC adulto não se aplicam a menores de 18 anos.");
  }
  const m = heightCm / 100;
  const value = weightKg / (m * m);
  const category = bmiCategory(value);
  const result: BmiResult = {
    value,
    display: value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    category,
    label: BMI_LABELS[category],
  };
  if (category === "obesidade") result.obesityClass = value < 35 ? 1 : value < 40 ? 2 : 3;
  return result;
}

/** Limites: <18,5 | 18,5 a <25 | 25 a <30 | ≥30. Usa o valor sem arredondar. */
export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return "baixo_peso";
  if (value < 25) return "saudavel";
  if (value < 30) return "sobrepeso";
  return "obesidade";
}

/** Faixa de peso correspondente ao IMC 18,5–24,9 para uma altura (referência populacional, não "peso ideal"). */
export function healthyWeightRange(heightCm: number): { min: number; max: number } {
  const m = heightCm / 100;
  return { min: 18.5 * m * m, max: 24.9 * m * m };
}
