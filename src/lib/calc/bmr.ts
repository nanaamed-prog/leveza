/**
 * Taxa metabólica basal (TMB) — equação de Mifflin–St Jeor (1990).
 *   TMB = 10 × peso(kg) + 6,25 × altura(cm) − 5 × idade(anos) + s
 *   s = +5 (parâmetro "masculino") | −161 (parâmetro "feminino")
 *
 * A equação foi derivada com um parâmetro fisiológico binário. O Leveza NUNCA infere esse
 * parâmetro por aparência, nome ou identidade de gênero: a pessoa escolhe qual usar ou
 * prefere não informar. Sem o parâmetro, retornamos uma FAIXA entre os dois resultados.
 *
 * Limitações: erro individual típico de ±10% ou mais; menos precisa em atletas, pessoas com
 * obesidade grave, idosos, condições clínicas e uso de certos medicamentos. É uma estimativa.
 */

export type EquationParameter = "masculino" | "feminino" | "nao_informado";

export interface BmrInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  parameter: EquationParameter;
}

export interface BmrEstimate {
  /** Valor central usado nos cálculos (kcal/dia). */
  kcal: number;
  low: number;
  high: number;
  /** true quando é uma faixa (parâmetro não informado). */
  isRange: boolean;
  method: "mifflin_st_jeor";
}

export function mifflinStJeor(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  s: number,
): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + s;
}

export function estimateBmr(input: BmrInput): BmrEstimate | null {
  const { weightKg, heightCm, ageYears, parameter } = input;
  if (!(weightKg > 0) || !(heightCm > 0) || !(ageYears >= 18)) return null;
  const masc = mifflinStJeor(weightKg, heightCm, ageYears, 5);
  const fem = mifflinStJeor(weightKg, heightCm, ageYears, -161);
  if (parameter === "masculino")
    return {
      kcal: masc,
      low: masc * 0.9,
      high: masc * 1.1,
      isRange: false,
      method: "mifflin_st_jeor",
    };
  if (parameter === "feminino")
    return {
      kcal: fem,
      low: fem * 0.9,
      high: fem * 1.1,
      isRange: false,
      method: "mifflin_st_jeor",
    };
  const mid = (masc + fem) / 2;
  return { kcal: mid, low: fem * 0.9, high: masc * 1.1, isRange: true, method: "mifflin_st_jeor" };
}
