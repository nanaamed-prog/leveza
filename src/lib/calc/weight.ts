/**
 * Evolução de peso: média móvel, variação em relação à linha de base e avaliação de metas.
 * Nunca prevê data garantida nem perda linear. "Peso desejado" nunca é tratado como "peso ideal".
 */

import { healthyWeightRange } from "./bmi";

export interface WeightPoint {
  date: string; // YYYY-MM-DD local
  kg: number;
}

/** Média móvel simples por janela de dias corridos (inclui o dia atual). */
export function movingAverage(
  points: WeightPoint[],
  windowDays = 7,
): { date: string; avg: number }[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const toDay = (d: string) => Date.parse(d + "T00:00:00Z") / 86_400_000;
  return sorted.map((p) => {
    const t = toDay(p.date);
    const win = sorted.filter((q) => toDay(q.date) <= t && toDay(q.date) > t - windowDays);
    return { date: p.date, avg: win.reduce((s, q) => s + q.kg, 0) / win.length };
  });
}

export function changeFromBaseline(
  points: WeightPoint[],
): { baseline: number; latest: number; delta: number } | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const baseline = sorted[0]!.kg;
  const latest = sorted[sorted.length - 1]!.kg;
  return { baseline, latest, delta: latest - baseline };
}

export type GoalType = "habitos" | "manter" | "perder" | "ganhar";

export interface GoalAssessment {
  level: "ok" | "atencao" | "bloqueada";
  messages: string[];
}

/**
 * Avalia adequação do peso desejado. Não "corrige" o objetivo, apenas informa.
 * @param weeklyRateKg ritmo pretendido (kg/semana), opcional.
 */
export function assessWeightGoal(params: {
  goal: GoalType;
  currentKg: number;
  targetKg: number | null;
  heightCm: number;
  weeklyRateKg?: number | null;
}): GoalAssessment {
  const { goal, currentKg, targetKg, heightCm, weeklyRateKg } = params;
  const messages: string[] = [];
  let level: GoalAssessment["level"] = "ok";
  if (goal === "habitos" || goal === "manter" || targetKg === null) return { level, messages };

  const range = healthyWeightRange(heightCm);
  const m = heightCm / 100;
  const targetBmi = targetKg / (m * m);

  if (goal === "perder" && targetKg >= currentKg) {
    messages.push("O peso desejado não é menor que o atual. Confira o objetivo escolhido.");
    level = "atencao";
  }
  if (goal === "ganhar" && targetKg <= currentKg) {
    messages.push("O peso desejado não é maior que o atual. Confira o objetivo escolhido.");
    level = "atencao";
  }
  if (targetBmi < 18.5) {
    messages.push(
      `Esse peso corresponde a um IMC abaixo de 18,5. Como referência populacional, a faixa de IMC saudável para sua altura vai de ${range.min.toFixed(1)} a ${range.max.toFixed(1)} kg. Não vamos sugerir metas abaixo disso; converse com um profissional.`,
    );
    level = "bloqueada";
  }
  if (weeklyRateKg && Math.abs(weeklyRateKg) > currentKg * 0.01) {
    messages.push(
      "O ritmo pretendido passa de 1% do peso por semana. Ritmos graduais costumam ser mais seguros e sustentáveis.",
    );
    if (level === "ok") level = "atencao";
  }
  return { level, messages };
}

/**
 * Sugestão de meta diária de ingestão (opcional, só quando elegível).
 * - manter: projeção de gasto
 * - perder: até 15% abaixo da projeção, nunca abaixo da TMB estimada nem de 1.200 kcal
 * - ganhar: +10%
 */
export function suggestIntakeTarget(params: {
  goal: GoalType;
  projectedExpenditure: number;
  bmr: number | null;
  deficitAllowed: boolean;
}): { kcal: number; note: string } | null {
  const { goal, projectedExpenditure, bmr, deficitAllowed } = params;
  if (!(projectedExpenditure > 0)) return null;
  if (goal === "habitos") return null;
  if (goal === "manter")
    return { kcal: Math.round(projectedExpenditure / 10) * 10, note: "Próximo ao gasto estimado." };
  if (goal === "ganhar")
    return {
      kcal: Math.round((projectedExpenditure * 1.1) / 10) * 10,
      note: "Cerca de 10% acima do gasto estimado.",
    };
  if (!deficitAllowed) return null;
  const floor = Math.max(bmr ?? 0, 1200);
  const kcal = Math.max(projectedExpenditure * 0.85, floor);
  return {
    kcal: Math.round(kcal / 10) * 10,
    note: "Até 15% abaixo do gasto estimado, sem ficar abaixo do seu metabolismo basal estimado.",
  };
}

/**
 * Regra aproximada: ~7.700 kcal de saldo acumulado ≈ 1 kg de gordura corporal.
 * É uma estimativa teórica — na prática a perda costuma ser menor com o tempo (adaptação do
 * metabolismo, água, glicogênio) e a balança oscila por outros motivos.
 */
export const KCAL_PER_KG = 7700;

export interface CumulativeEstimate {
  days: number; // dias considerados (com refeições registradas e já encerrados)
  totalBalanceKcal: number; // negativo = déficit
  estimatedKg: number; // negativo = perda estimada
  averageDailyKcal: number | null;
}

/** Soma o saldo (consumido − gasto) dos dias completos. Exclui o dia em andamento e dias sem refeição. */
export function cumulativeBalanceEstimate(rows: { date: string; balance: number | null }[], today: string): CumulativeEstimate {
  const valid = rows.filter((r) => r.balance !== null && r.date < today);
  const total = valid.reduce((s, r) => s + (r.balance as number), 0);
  return {
    days: valid.length,
    totalBalanceKcal: total,
    estimatedKg: total / KCAL_PER_KG,
    averageDailyKcal: valid.length ? total / valid.length : null,
  };
}

/**
 * Menor meta diária de consumo que o app aceita salvar.
 * - Perfil que permite déficit: nunca abaixo de 1.200 kcal nem da TMB estimada (limite inferior da faixa).
 * - Perfil sem déficit (gestação, amamentação, menores, contraindicações): a meta não pode ficar
 *   abaixo do gasto estimado do dia — ou seja, não vira meta restritiva.
 */
export function kcalTargetFloor(p: { deficitAllowed: boolean; bmrLow: number | null; projectedExpenditure: number | null }): number {
  if (p.deficitAllowed) return Math.max(1200, Math.round(p.bmrLow ?? 0));
  return Math.max(1200, Math.round((p.projectedExpenditure ?? 0) / 10) * 10);
}

export const KCAL_TARGET_MAX = 6000;
