/**
 * PLANO INTELIGENTE DE EMAGRECIMENTO — motor de simulação.
 *
 * Hipóteses (ver docs/PLANO_EMAGRECIMENTO.md):
 * - Gasto diário (TDEE) = linha de base + exercício INCREMENTAL.
 *   Linha de base = fator individual × peso × (horas de sono × 0,95 + horas acordado × MET habitual),
 *   com fator = TMB (Mifflin–St Jeor) ÷ (peso × 24). É o mesmo modelo por períodos do restante do app.
 *   Exercício entra só como (MET da atividade − MET habitual) × peso × horas × fator: o tempo do
 *   treino SUBSTITUI o tempo habitual daquele horário, então nada é somado duas vezes.
 * - Modelo dinâmico semanal: a cada semana o peso muda, a TMB e o gasto são recalculados com o novo
 *   peso e uma termogênese adaptativa reduz parte do déficit. 7.700 kcal/kg é usado só como
 *   densidade energética aproximada do tecido perdido dentro desse modelo — nunca como previsão fixa.
 * - Incerteza: três trajetórias (otimista, central, conservadora) variando gasto e adaptação.
 *   Em lactantes, o custo da amamentação entra como FAIXA (não como valor prescrito).
 * - Nada aqui é diagnóstico nem prescrição. Projeções são estimativas com margem de erro.
 */

import { estimateBmr, type EquationParameter } from "./bmr";
import { BASELINE_AWAKE_MET, SLEEP_MET, type ActivityLevel } from "./met";
import { healthyWeightRange } from "./bmi";
import type { Eligibility } from "./eligibility";

export const ENERGY_DENSITY_KCAL_PER_KG = 7700;
export const MIN_INTAKE_KCAL = 1200;
export const MAX_WEEKLY_LOSS_FRACTION = 0.01; // 1% do peso por semana
export const MAX_WEEKS = 156; // 3 anos: além disso dizemos "não alcança com este cenário"

export type ExerciseIntensity = "leve" | "moderada" | "intensa";
export type BreastfeedingPattern = "exclusiva" | "parcial" | "nao_informado";

/** METs de referência (Compendium of Physical Activities, valores típicos por intensidade). */
export const INTENSITY_MET: Record<ExerciseIntensity, number> = {
  leve: 3.0, // caminhada leve, alongamento ativo
  moderada: 4.5, // caminhada rápida, bicicleta leve, dança
  intensa: 7.0, // corrida leve, treino funcional vigoroso
};

export const INTENSITY_LABEL: Record<ExerciseIntensity, string> = {
  leve: "Leve",
  moderada: "Moderada",
  intensa: "Intensa",
};

/** Custo energético da amamentação como faixa (kcal/dia), não como valor a “compensar”. */
export const LACTATION_COST_RANGE: Record<BreastfeedingPattern, [number, number]> = {
  exclusiva: [300, 600],
  parcial: [100, 400],
  nao_informado: [100, 600],
};

export interface ExercisePlan {
  daysPerWeek: number; // 0–7
  minutes: number; // por sessão
  intensity: ExerciseIntensity;
}

export interface PlanInput {
  startKg: number;
  targetKg: number;
  heightCm: number;
  ageYears: number;
  parameter: EquationParameter;
  activityLevel: ActivityLevel;
  sleepHours: number;
  intakeKcal: number;
  exercise: ExercisePlan;
  /** Só para lactantes: amplia a incerteza do gasto. */
  lactation?: BreastfeedingPattern | null;
}

export interface Trajectory {
  /** peso por semana, índice 0 = hoje */
  weights: number[];
  weeksToGoal: number | null;
}

export interface EnergySnapshot {
  bmr: number;
  baselineKcal: number;
  exerciseKcalPerDay: number;
  tdee: number;
  balance: number; // ingestão − gasto (negativo = déficit)
  weeklyExerciseKcal: number;
  weeklyExpenditure: number;
  exerciseHoursPerWeek: number;
}

export interface SimulationResult {
  energy: EnergySnapshot;
  central: Trajectory;
  optimistic: Trajectory;
  conservative: Trajectory;
  /** Ritmo central estimado nas primeiras 4 semanas (kg/semana, negativo = perda). */
  initialWeeklyChangeKg: number;
  direction: "perda" | "manutencao" | "ganho";
}

function bmrCentral(kg: number, heightCm: number, age: number, parameter: EquationParameter) {
  const b = estimateBmr({ weightKg: kg, heightCm, ageYears: age, parameter });
  return b ? b.kcal : 0;
}

/** Gasto diário (kcal) sem e com exercício, para um peso. Sem dupla contagem. */
export function dailyEnergy(input: PlanInput, kg: number): Omit<EnergySnapshot, "balance"> {
  const bmr = bmrCentral(kg, input.heightCm, input.ageYears, input.parameter);
  const factor = bmr / (kg * 24);
  const sleep = Math.min(Math.max(input.sleepHours, 4), 12);
  const baseMet = BASELINE_AWAKE_MET[input.activityLevel];
  const baselineKcal = factor * kg * (sleep * SLEEP_MET + (24 - sleep) * baseMet);
  const { daysPerWeek, minutes, intensity } = input.exercise;
  const days = Math.min(Math.max(daysPerWeek, 0), 7);
  const hours = Math.min(Math.max(minutes, 0), 240) / 60;
  const incrementalMet = Math.max(0, INTENSITY_MET[intensity] - baseMet);
  const perSession = factor * kg * hours * incrementalMet;
  const exerciseKcalPerDay = (perSession * days) / 7;
  const tdee = baselineKcal + exerciseKcalPerDay;
  return {
    bmr,
    baselineKcal,
    exerciseKcalPerDay,
    tdee,
    weeklyExerciseKcal: perSession * days,
    weeklyExpenditure: tdee * 7,
    exerciseHoursPerWeek: hours * days,
  };
}

function runTrajectory(
  input: PlanInput,
  tdeeScale: number,
  adaptation: number,
  extraKcal: number,
): Trajectory {
  const weights = [input.startKg];
  let kg = input.startKg;
  let weeksToGoal: number | null = null;
  const losing = input.targetKg < input.startKg;
  for (let w = 1; w <= MAX_WEEKS; w++) {
    const e = dailyEnergy(input, kg);
    const tdee = e.tdee * tdeeScale + extraKcal;
    let balance = input.intakeKcal - tdee;
    // Termogênese adaptativa: parte do déficit é “compensada” pelo corpo (aumenta com o tempo).
    if (balance < 0) balance *= 1 - adaptation * Math.min(1, w / 8);
    kg = kg + (balance * 7) / ENERGY_DENSITY_KCAL_PER_KG;
    weights.push(kg);
    if (weeksToGoal === null && (losing ? kg <= input.targetKg : kg >= input.targetKg)) {
      weeksToGoal = w;
    }
  }
  return { weights, weeksToGoal };
}

export function simulatePlan(input: PlanInput): SimulationResult {
  const e = dailyEnergy(input, input.startKg);
  const [lacLow, lacHigh] = input.lactation ? LACTATION_COST_RANGE[input.lactation] : [0, 0];
  const lacMid = (lacLow + lacHigh) / 2;
  const tdee = e.tdee + lacMid;
  const balance = input.intakeKcal - tdee;
  const spread = input.lactation ? 0.12 : 0.08;
  const central = runTrajectory(input, 1, 0.1, lacMid);
  const optimistic = runTrajectory(input, 1 + spread, 0.05, lacHigh);
  const conservative = runTrajectory(input, 1 - spread, 0.15, lacLow);
  const w4 = central.weights[4] ?? input.startKg;
  const initialWeeklyChangeKg = (w4 - input.startKg) / 4;
  const direction =
    Math.abs(initialWeeklyChangeKg) < 0.05
      ? "manutencao"
      : initialWeeklyChangeKg < 0
        ? "perda"
        : "ganho";
  return {
    energy: { ...e, tdee, balance, weeklyExpenditure: tdee * 7 },
    central,
    optimistic,
    conservative,
    initialWeeklyChangeKg,
    direction,
  };
}

/** Faixa de semanas até a meta. null = não alcança em 3 anos com este cenário. */
export function etaRange(
  r: SimulationResult,
): { min: number; central: number; max: number } | null {
  const c = r.central.weeksToGoal;
  if (c === null) return null;
  const a = r.optimistic.weeksToGoal ?? c;
  const b = r.conservative.weeksToGoal ?? MAX_WEEKS;
  return { min: Math.min(a, c), central: c, max: Math.max(b, c) };
}

/** Peso projetado em uma semana (central e faixa). */
export function projectionAt(r: SimulationResult, week: number) {
  const pick = (t: Trajectory) => t.weights[Math.min(week, t.weights.length - 1)]!;
  const a = pick(r.optimistic);
  const b = pick(r.conservative);
  return { central: pick(r.central), low: Math.min(a, b), high: Math.max(a, b) };
}

export function formatWeeksRange(eta: { min: number; max: number } | null): string {
  if (!eta) return "não alcança a meta com este cenário";
  const fmt = (w: number) => (w >= 9 ? `${Math.round(w / 4.345)} meses` : `${w} semanas`);
  if (eta.max >= MAX_WEEKS) return `mais de ${fmt(eta.min)} (incerto)`;
  if (eta.min === eta.max) return `cerca de ${fmt(eta.min)}`;
  const sameUnit = eta.min >= 9 === eta.max >= 9;
  if (sameUnit && eta.min >= 9)
    return `entre ${Math.round(eta.min / 4.345)} e ${Math.round(eta.max / 4.345)} meses`;
  if (sameUnit) return `entre ${eta.min} e ${eta.max} semanas`;
  return `entre ${fmt(eta.min)} e ${fmt(eta.max)}`;
}

/* ------------------------------------------------------------------ */
/* Cenários de atividade                                                */
/* ------------------------------------------------------------------ */

export type ScenarioKey = "leve" | "moderada" | "intensa";

/** Cenários realistas: o intenso prevê descanso (não é treino intenso todo dia). */
export const SCENARIOS: Record<ScenarioKey, ExercisePlan & { label: string; text: string }> = {
  leve: {
    label: "Leve",
    text: "Caminhadas leves, 3× por semana",
    daysPerWeek: 3,
    minutes: 30,
    intensity: "leve",
  },
  moderada: {
    label: "Moderada",
    text: "Caminhada rápida ou dança, 4× por semana",
    daysPerWeek: 4,
    minutes: 40,
    intensity: "moderada",
  },
  intensa: {
    label: "Intensa",
    text: "Treino vigoroso 3× + 2 dias leves de recuperação",
    daysPerWeek: 3,
    minutes: 45,
    intensity: "intensa",
  },
};

/* ------------------------------------------------------------------ */
/* Segurança                                                            */
/* ------------------------------------------------------------------ */

export type PlanAccess = "completo" | "informativo_lactante" | "bloqueado";

export interface SafetyResult {
  /** Pode transformar a simulação em plano salvo? */
  canSave: boolean;
  /** A simulação pode ser exibida? */
  canSimulate: boolean;
  access: PlanAccess;
  blocks: string[];
  warnings: string[];
}

export const RED_FLAG_SYMPTOMS = {
  tontura: "Tontura ou sensação de desmaio",
  cansaco: "Cansaço intenso",
  fome: "Fome constante ou muito intensa",
  amamentacao: "Mudança percebida na amamentação",
} as const;
export type RedFlag = keyof typeof RED_FLAG_SYMPTOMS;

export function planAccess(e: Eligibility): PlanAccess {
  if (e.mode === "lactante" && e.ageYears !== null && e.ageYears >= 18) {
    // Lactante só acessa no modo informativo, e apenas se não houver outros impedimentos.
    const others = e.weightLoss.reasons.filter((r) => !/amamenta/i.test(r));
    return others.length === 0 ? "informativo_lactante" : "bloqueado";
  }
  return e.weightLoss.allowed ? "completo" : "bloqueado";
}

export function evaluatePlanSafety(params: {
  eligibility: Eligibility;
  input: PlanInput;
  result: SimulationResult;
  recentRedFlags: RedFlag[];
}): SafetyResult {
  const { eligibility, input, result, recentRedFlags } = params;
  const access = planAccess(eligibility);
  const blocks: string[] = [];
  const warnings: string[] = [];

  if (access === "bloqueado") {
    return {
      canSave: false,
      canSimulate: false,
      access,
      blocks: eligibility.weightLoss.reasons,
      warnings,
    };
  }

  const floor = Math.max(MIN_INTAKE_KCAL, result.energy.bmr);
  if (input.intakeKcal < floor)
    blocks.push(
      `A ingestão simulada fica abaixo de ${Math.round(floor / 10) * 10} kcal (seu metabolismo basal estimado ou o mínimo de 1.200 kcal). Isso não pode virar plano.`,
    );
  if (-result.initialWeeklyChangeKg > input.startKg * MAX_WEEKLY_LOSS_FRACTION)
    blocks.push(
      "O ritmo de perda passaria de 1% do peso por semana. Ritmos graduais são mais seguros e sustentáveis.",
    );
  const range = healthyWeightRange(input.heightCm);
  if (input.targetKg < range.min)
    blocks.push(
      `O peso desejado corresponde a um IMC abaixo de 18,5 (abaixo de ${range.min.toFixed(1)} kg para sua altura). Não montamos planos para esse peso.`,
    );
  const { daysPerWeek, minutes, intensity } = input.exercise;
  if (intensity === "intensa" && daysPerWeek > 5)
    blocks.push(
      "Treino intenso mais de 5 dias por semana não deixa espaço para recuperação. Inclua dias leves ou de descanso.",
    );
  if (minutes * daysPerWeek > 600)
    blocks.push(
      "Mais de 10 horas de exercício por semana não é considerado em um plano automático.",
    );
  if (intensity === "intensa" && minutes > 90)
    blocks.push("Sessões intensas acima de 90 minutos exigem acompanhamento profissional.");
  if (recentRedFlags.length > 0)
    blocks.push(
      "Você registrou sintomas como tontura, cansaço intenso, fome constante ou mudanças na amamentação nos últimos 7 dias. Pausamos recomendações de perda de peso: procure avaliação profissional.",
    );

  if (intensity === "intensa" && daysPerWeek >= 4)
    warnings.push("Alterne dias intensos com dias leves. Recuperação também faz parte do plano.");
  if (result.direction !== "perda" && input.targetKg < input.startKg)
    warnings.push(
      "Com este cenário, a tendência é manter ou ganhar peso. Isso não é um problema — é só informação.",
    );
  if (result.energy.balance < -1000)
    warnings.push(
      "Déficit maior não é necessariamente melhor: costuma ser mais difícil de manter e aumenta a fome.",
    );
  if (input.parameter === "nao_informado")
    warnings.push(
      "Sem o parâmetro da equação metabólica, o gasto é estimado como média de uma faixa — a incerteza é maior.",
    );

  const lactante = access === "informativo_lactante";
  return {
    canSave: !lactante && blocks.length === 0,
    canSimulate: recentRedFlags.length === 0 || lactante,
    access,
    blocks: lactante
      ? [
          "No Modo Lactante, as projeções são apenas informativas e não viram plano de restrição calórica. Para um plano individual, procure nutricionista ou médico.",
          ...blocks,
        ]
      : blocks,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Tendência observada e confiança                                      */
/* ------------------------------------------------------------------ */

export interface ObservedPoint {
  date: string; // YYYY-MM-DD
  kg: number;
}

const dayNum = (d: string) => Date.parse(d + "T00:00:00Z") / 86_400_000;

/**
 * Tendência por regressão linear da média móvel de 7 dias nas últimas `windowDays`.
 * Exige ≥ 3 pesagens cobrindo ≥ 14 dias — variações isoladas (água, ciclo, sono) não bastam.
 */
export function observedTrend(
  points: ObservedPoint[],
  asOf: string,
  windowDays = 42,
): { kgPerWeek: number; n: number; spanDays: number } | null {
  const end = dayNum(asOf);
  const pts = points
    .filter((p) => dayNum(p.date) <= end && dayNum(p.date) > end - windowDays)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length < 3) return null;
  const span = dayNum(pts[pts.length - 1]!.date) - dayNum(pts[0]!.date);
  if (span < 14) return null;
  const smooth = pts.map((p) => {
    const t = dayNum(p.date);
    const win = pts.filter((q) => dayNum(q.date) <= t && dayNum(q.date) > t - 7);
    return { x: t, y: win.reduce((s, q) => s + q.kg, 0) / win.length };
  });
  const mx = smooth.reduce((s, p) => s + p.x, 0) / smooth.length;
  const my = smooth.reduce((s, p) => s + p.y, 0) / smooth.length;
  let num = 0;
  let den = 0;
  for (const p of smooth) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  if (den === 0) return null;
  return { kgPerWeek: (num / den) * 7, n: pts.length, spanDays: span };
}

/** Semanas até a meta pelo ritmo observado (só se estiver indo na direção da meta). */
export function observedEta(currentKg: number, targetKg: number, kgPerWeek: number): number | null {
  const diff = targetKg - currentKg;
  if (Math.abs(diff) < 0.1) return 0;
  if (kgPerWeek === 0 || Math.sign(diff) !== Math.sign(kgPerWeek)) return null;
  const w = diff / kgPerWeek;
  return w > MAX_WEEKS ? null : Math.ceil(w);
}

/** Histórico do tempo previsto: para cada semana passada, o ETA calculado com os dados até ali. */
export function etaHistory(
  points: ObservedPoint[],
  targetKg: number,
  today: string,
  weeks = 12,
): { date: string; weeks: number | null }[] {
  const out: { date: string; weeks: number | null }[] = [];
  for (let i = weeks; i >= 0; i--) {
    const asOf = new Date((dayNum(today) - i * 7) * 86_400_000).toISOString().slice(0, 10);
    const t = observedTrend(points, asOf);
    const past = points.filter((p) => p.date <= asOf).sort((a, b) => a.date.localeCompare(b.date));
    const last = past[past.length - 1];
    out.push({ date: asOf, weeks: t && last ? observedEta(last.kg, targetKg, t.kgPerWeek) : null });
  }
  return out;
}

export type Confidence = "baixa" | "moderada" | "boa";

/** Confiança nunca é “alta”: previsões de peso têm incerteza individual grande. */
export function predictionConfidence(p: {
  weighInsLast28: number;
  foodDaysLast14: number;
  parameterInformed: boolean;
  lactante: boolean;
}): { level: Confidence; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  if (p.weighInsLast28 >= 6) score += 2;
  else if (p.weighInsLast28 >= 3) score += 1;
  else reasons.push("Poucas pesagens nas últimas 4 semanas.");
  if (p.foodDaysLast14 >= 10) score += 2;
  else if (p.foodDaysLast14 >= 5) score += 1;
  else reasons.push("Poucos dias com alimentação registrada.");
  if (p.parameterInformed) score += 1;
  else reasons.push("Parâmetro da equação metabólica não informado.");
  if (p.lactante) reasons.push("A amamentação aumenta a incerteza do gasto energético.");
  const level: Confidence = p.lactante
    ? "baixa"
    : score >= 4
      ? "boa"
      : score >= 2
        ? "moderada"
        : "baixa";
  return { level, reasons };
}
