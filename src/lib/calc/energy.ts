/**
 * GASTO ENERGÉTICO DIÁRIO ESTIMADO — modelo de linha do tempo sem dupla contagem.
 *
 * O dia (no fuso do usuário) é dividido em períodos MUTUAMENTE EXCLUSIVOS:
 *   1. Sono registrado  → MET 0,95 (minutos acordados na cama → MET 1,0)
 *   2. Atividades registradas → MET da atividade/intensidade
 *   3. Restante do tempo acordado → MET basal do nível habitual de atividade
 *
 * kcal = Σ (MET × peso_kg × horas) × fator_individual
 *
 * fator_individual = TMB(Mifflin–St Jeor) ÷ (1 kcal/kg/h × peso × 24 h). Ele ajusta a
 * convenção "MET 1 ≈ 1 kcal/kg/h" à estimativa individual de repouso. Sem TMB, fator = 1.
 *
 * Por que não há dupla contagem:
 *   - NÃO somamos TMB + TDEE + exercício + sono. Cada minuto do dia recebe UM único MET.
 *   - Uma atividade substitui o tempo basal daquele intervalo (o MET já inclui o repouso).
 *   - Sobreposições (ex.: atividade registrada dentro do horário de sono, ou duas atividades
 *     no mesmo horário) são resolvidas usando o MAIOR MET do instante e reportadas ao usuário.
 *   - Passos de pedômetro não são somados (evita contar a mesma caminhada duas vezes).
 *
 * "Gasto até agora" (dia em andamento) é separado da "projeção para 24 h".
 */

import { AWAKE_IN_BED_MET, SLEEP_MET } from "./met";

export interface SleepPeriod {
  id: string;
  start: number; // epoch ms (UTC)
  end: number;
  awakeMinutes?: number;
}

export interface ActivityPeriod {
  id: string;
  start: number;
  end: number;
  met: number;
}

export interface DayEnergyInput {
  dayStart: number;
  dayEnd: number;
  now: number;
  weightKg: number;
  /** TMB estimada (kcal/dia). null → fator 1. */
  bmrKcal: number | null;
  bmrLow?: number | null;
  bmrHigh?: number | null;
  baselineMet: number;
  sleeps: SleepPeriod[];
  activities: ActivityPeriod[];
  /** Amamentação: custo diário estimado (central e faixa), distribuído ao longo do dia. */
  lactation?: { kcal: number; low: number; high: number } | null;
}

export interface EnergyTotals {
  kcal: number;
  low: number;
  high: number;
  /** Parte do total que vem da amamentação (0 quando não se aplica). */
  lactationKcal: number;
  minutes: { sleep: number; activity: number; baseline: number };
  kcalBy: { sleep: number; activity: number; baseline: number };
}

export interface Overlap {
  a: string;
  b: string;
  minutes: number;
}

export interface DayEnergyResult {
  elapsed: EnergyTotals;
  projected24h: EnergyTotals;
  overlaps: Overlap[];
  factor: number;
}

interface Seg {
  id: string;
  kind: "sleep" | "activity";
  start: number;
  end: number;
  met: number;
}

const MS_PER_H = 3_600_000;

function sleepMet(s: SleepPeriod): number {
  const totalMin = Math.max(0, (s.end - s.start) / 60_000);
  if (totalMin === 0) return SLEEP_MET;
  const awake = Math.min(Math.max(0, s.awakeMinutes ?? 0), totalMin);
  return ((totalMin - awake) * SLEEP_MET + awake * AWAKE_IN_BED_MET) / totalMin;
}

function toSegments(input: DayEnergyInput): Seg[] {
  const segs: Seg[] = [];
  for (const s of input.sleeps) {
    if (s.end > s.start)
      segs.push({ id: s.id, kind: "sleep", start: s.start, end: s.end, met: sleepMet(s) });
  }
  for (const a of input.activities) {
    if (a.end > a.start && a.met > 0)
      segs.push({ id: a.id, kind: "activity", start: a.start, end: a.end, met: a.met });
  }
  return segs;
}

export function findOverlaps(
  segs: { id: string; start: number; end: number }[],
  from: number,
  to: number,
): Overlap[] {
  const out: Overlap[] = [];
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const a = segs[i]!;
      const b = segs[j]!;
      const s = Math.max(a.start, b.start, from);
      const e = Math.min(a.end, b.end, to);
      if (e > s) out.push({ a: a.id, b: b.id, minutes: Math.round((e - s) / 60_000) });
    }
  }
  return out;
}

function integrate(
  segs: Seg[],
  from: number,
  to: number,
  input: DayEnergyInput,
  factor: number,
): Omit<EnergyTotals, "low" | "high" | "lactationKcal"> {
  const minutes = { sleep: 0, activity: 0, baseline: 0 };
  const metHours = { sleep: 0, activity: 0, baseline: 0 };
  if (to <= from) return { kcal: 0, minutes, kcalBy: { sleep: 0, activity: 0, baseline: 0 } };

  const points = new Set<number>([from, to]);
  for (const s of segs) {
    if (s.start > from && s.start < to) points.add(s.start);
    if (s.end > from && s.end < to) points.add(s.end);
  }
  const sorted = [...points].sort((x, y) => x - y);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    const mid = (a + b) / 2;
    let best: Seg | null = null;
    for (const s of segs) {
      if (s.start <= mid && s.end > mid && (!best || s.met > best.met)) best = s;
    }
    const hours = (b - a) / MS_PER_H;
    const kind = best ? best.kind : "baseline";
    const met = best ? best.met : input.baselineMet;
    minutes[kind] += hours * 60;
    metHours[kind] += met * hours;
  }
  const w = input.weightKg;
  const kcalBy = {
    sleep: metHours.sleep * w * factor,
    activity: metHours.activity * w * factor,
    baseline: metHours.baseline * w * factor,
  };
  return { kcal: kcalBy.sleep + kcalBy.activity + kcalBy.baseline, minutes, kcalBy };
}

export function computeDayEnergy(input: DayEnergyInput): DayEnergyResult {
  if (!(input.weightKg > 0)) throw new Error("Peso necessário para estimar o gasto.");
  if (!(input.dayEnd > input.dayStart)) throw new Error("Intervalo do dia inválido.");

  const refRest = input.weightKg * 24; // kcal/dia com MET 1 ≈ 1 kcal/kg/h
  const factor = input.bmrKcal && input.bmrKcal > 0 ? input.bmrKcal / refRest : 1;
  const lowRatio = input.bmrKcal && input.bmrLow ? input.bmrLow / input.bmrKcal : 0.85;
  const highRatio = input.bmrKcal && input.bmrHigh ? input.bmrHigh / input.bmrKcal : 1.15;

  const segs = toSegments(input);
  const nowClamped = Math.min(Math.max(input.now, input.dayStart), input.dayEnd);

  const lac = input.lactation ?? null;
  const dayMs = input.dayEnd - input.dayStart;
  const withRange = (
    t: Omit<EnergyTotals, "low" | "high" | "lactationKcal">,
    fraction: number,
  ): EnergyTotals => {
    const lk = lac ? lac.kcal * fraction : 0;
    return {
      ...t,
      kcal: t.kcal + lk,
      low: t.kcal * lowRatio + (lac ? lac.low * fraction : 0),
      high: t.kcal * highRatio + (lac ? lac.high * fraction : 0),
      lactationKcal: lk,
    };
  };

  return {
    elapsed: withRange(
      integrate(segs, input.dayStart, nowClamped, input, factor),
      (nowClamped - input.dayStart) / dayMs,
    ),
    projected24h: withRange(integrate(segs, input.dayStart, input.dayEnd, input, factor), 1),
    overlaps: findOverlaps(segs, input.dayStart, input.dayEnd),
    factor,
  };
}

/** Gasto BRUTO de uma atividade (MET × peso × h × fator), para exibir no card da atividade.
 *  O quanto ela de fato altera o total do dia é o "acréscimo" sobre o tempo basal
 *  (activityIncrementKcal), porque ela substitui esse tempo. */
export function activityKcal(met: number, weightKg: number, minutes: number, factor = 1): number {
  return met * weightKg * (minutes / 60) * factor;
}

export function activityIncrementKcal(
  met: number,
  baselineMet: number,
  weightKg: number,
  minutes: number,
  factor = 1,
): number {
  return Math.max(0, met - baselineMet) * weightKg * (minutes / 60) * factor;
}

/** Saldo = consumido − gasto. Negativo = consumiu menos do que o gasto estimado. */
export function energyBalance(consumedKcal: number, expenditureKcal: number): number {
  return consumedKcal - expenditureKcal;
}

export function describeBalance(balance: number): string {
  const abs = Math.round(Math.abs(balance));
  if (abs < 50) return "Consumo próximo do gasto estimado";
  return balance < 0
    ? `${abs.toLocaleString("pt-BR")} kcal abaixo do gasto estimado`
    : `${abs.toLocaleString("pt-BR")} kcal acima do gasto estimado`;
}
