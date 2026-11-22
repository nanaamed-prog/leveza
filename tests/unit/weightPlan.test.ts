import { describe, expect, it } from "vitest";
import {
  dailyEnergy,
  etaHistory,
  etaRange,
  evaluatePlanSafety,
  formatWeeksRange,
  observedEta,
  observedTrend,
  planAccess,
  predictionConfidence,
  projectionAt,
  SCENARIOS,
  simulatePlan,
  type PlanInput,
} from "@/lib/calc/weightPlan";
import { evaluateEligibility, type HealthScreening } from "@/lib/calc/eligibility";

const base: PlanInput = {
  startKg: 82,
  targetKg: 72,
  heightCm: 165,
  ageYears: 35,
  parameter: "feminino",
  activityLevel: "leve",
  sleepHours: 8,
  intakeKcal: 1700,
  exercise: { daysPerWeek: 0, minutes: 0, intensity: "leve" },
};

const screening = (over: Partial<HealthScreening> = {}): HealthScreening => ({
  birth_date: "1990-05-10",
  pregnant: "nao",
  breastfeeding: "nao",
  eating_disorder: "nao",
  diabetes: "nao",
  hypoglycemia_meds: "nao",
  clinical_conditions: ["nenhuma"],
  physical_limitations: null,
  dietary_restrictions: null,
  consent_health_data: true,
  ...over,
});
const today = new Date("2026-11-22T12:00:00Z");

describe("gasto energético sem dupla contagem", () => {
  it("sem exercício, o gasto é só a linha de base", () => {
    const e = dailyEnergy(base, 82);
    expect(e.exerciseKcalPerDay).toBe(0);
    expect(e.tdee).toBeCloseTo(e.baselineKcal);
    // fator de atividade médio ≈ 1,45 × TMB para nível “leve” com 8 h de sono
    expect(e.tdee / e.bmr).toBeGreaterThan(1.35);
    expect(e.tdee / e.bmr).toBeLessThan(1.55);
  });

  it("exercício entra só como acréscimo acima do MET habitual", () => {
    const withEx = dailyEnergy({ ...base, exercise: SCENARIOS.moderada }, 82);
    const factor = withEx.bmr / (82 * 24);
    const expectedWeekly = factor * 82 * (40 / 60) * (4.5 - 1.7) * 4;
    expect(withEx.weeklyExerciseKcal).toBeCloseTo(expectedWeekly, 3);
    // somar MET bruto (4,5) contaria de novo o tempo habitual; o incremento é menor
    const naive = factor * 82 * (40 / 60) * 4.5 * 4;
    expect(withEx.weeklyExerciseKcal).toBeLessThan(naive);
  });

  it("quem já é muito ativo ganha menos com o mesmo treino (o habitual já está na base)", () => {
    const ex = { daysPerWeek: 3, minutes: 30, intensity: "leve" as const };
    const sed = dailyEnergy({ ...base, activityLevel: "sedentario", exercise: ex }, 82);
    const ativo = dailyEnergy({ ...base, activityLevel: "ativo", exercise: ex }, 82);
    expect(ativo.exerciseKcalPerDay).toBeLessThan(sed.exerciseKcalPerDay);
    expect(ativo.exerciseKcalPerDay).toBeGreaterThanOrEqual(0);
  });
});

describe("modelo dinâmico", () => {
  it("a perda desacelera com o tempo (gasto cai junto com o peso)", () => {
    const r = simulatePlan(base);
    const w = r.central.weights;
    const first = w[0]! - w[4]!;
    const later = w[40]! - w[44]!;
    expect(first).toBeGreaterThan(later);
  });

  it("é mais lento que a regra fixa de 7.700 kcal/kg", () => {
    const r = simulatePlan(base);
    const naiveWeeks = (10 * 7700) / (-r.energy.balance * 7);
    expect(r.central.weeksToGoal!).toBeGreaterThan(naiveWeeks);
  });

  it("gera faixa de incerteza ordenada", () => {
    const r = simulatePlan(base);
    const eta = etaRange(r)!;
    expect(eta.min).toBeLessThanOrEqual(eta.central);
    expect(eta.central).toBeLessThanOrEqual(eta.max);
    const p = projectionAt(r, 12);
    expect(p.low).toBeLessThanOrEqual(p.central);
    expect(p.central).toBeLessThanOrEqual(p.high);
  });

  it("mais atividade encurta o prazo estimado", () => {
    const leve = etaRange(simulatePlan({ ...base, exercise: SCENARIOS.leve }))!.central;
    const mod = etaRange(simulatePlan({ ...base, exercise: SCENARIOS.moderada }))!.central;
    const int = etaRange(simulatePlan({ ...base, exercise: SCENARIOS.intensa }))!.central;
    expect(mod).toBeLessThan(leve);
    expect(int).toBeLessThan(leve);
  });

  it("ingestão acima do gasto não chega à meta de perda", () => {
    const r = simulatePlan({ ...base, intakeKcal: 3000 });
    expect(r.direction).toBe("ganho");
    expect(etaRange(r)).toBeNull();
    expect(formatWeeksRange(null)).toMatch(/não alcança/);
  });

  it("lactante: faixa mais larga (incerteza maior)", () => {
    const normal = projectionAt(simulatePlan(base), 12);
    const lac = projectionAt(simulatePlan({ ...base, lactation: "exclusiva" }), 12);
    expect(lac.high - lac.low).toBeGreaterThan(normal.high - normal.low);
  });
});

describe("bloqueios de segurança", () => {
  const eligible = evaluateEligibility(screening(), { today, currentBmi: 30 });
  const check = (input: PlanInput, flags: never[] = []) =>
    evaluatePlanSafety({
      eligibility: eligible,
      input,
      result: simulatePlan(input),
      recentRedFlags: flags,
    });

  it("cenário moderado e gradual pode virar plano", () => {
    const s = check({ ...base, exercise: SCENARIOS.moderada });
    expect(s.blocks).toEqual([]);
    expect(s.canSave).toBe(true);
  });

  it("ingestão abaixo do basal/1.200 kcal é bloqueada", () => {
    const s = check({ ...base, intakeKcal: 1000 });
    expect(s.canSave).toBe(false);
    expect(s.blocks.join(" ")).toMatch(/abaixo de/);
  });

  it("ritmo acima de 1% do peso por semana é bloqueado", () => {
    const s = check({
      ...base,
      intakeKcal: 1250,
      exercise: { daysPerWeek: 5, minutes: 60, intensity: "intensa" },
    });
    expect(s.canSave).toBe(false);
    expect(s.blocks.join(" ")).toMatch(/1% do peso/);
  });

  it("treino intenso todos os dias é bloqueado (sem recuperação)", () => {
    const s = check({
      ...base,
      intakeKcal: 2000,
      exercise: { daysPerWeek: 7, minutes: 30, intensity: "intensa" },
    });
    expect(s.blocks.join(" ")).toMatch(/recuperação/);
  });

  it("peso desejado com IMC < 18,5 é bloqueado", () => {
    const s = check({ ...base, targetKg: 45 });
    expect(s.blocks.join(" ")).toMatch(/18,5/);
  });

  it("sintomas recentes pausam a recomendação", () => {
    const s = evaluatePlanSafety({
      eligibility: eligible,
      input: base,
      result: simulatePlan(base),
      recentRedFlags: ["tontura"],
    });
    expect(s.canSave).toBe(false);
    expect(s.canSimulate).toBe(false);
  });

  it("gestante, menor ou histórico de transtorno não acessam o simulador", () => {
    for (const e of [
      evaluateEligibility(screening({ pregnant: "sim" }), { today }),
      evaluateEligibility(screening({ birth_date: "2012-01-01" }), { today }),
      evaluateEligibility(screening({ eating_disorder: "previo" }), { today }),
    ]) {
      expect(planAccess(e)).toBe("bloqueado");
      const s = evaluatePlanSafety({
        eligibility: e,
        input: base,
        result: simulatePlan(base),
        recentRedFlags: [],
      });
      expect(s.canSimulate).toBe(false);
      expect(s.canSave).toBe(false);
    }
  });

  it("lactante simula só no modo informativo e nunca salva plano", () => {
    const e = evaluateEligibility(screening({ breastfeeding: "sim" }), { today });
    expect(planAccess(e)).toBe("informativo_lactante");
    const input = { ...base, lactation: "exclusiva" as const, exercise: SCENARIOS.leve };
    const s = evaluatePlanSafety({
      eligibility: e,
      input,
      result: simulatePlan(input),
      recentRedFlags: [],
    });
    expect(s.canSimulate).toBe(true);
    expect(s.canSave).toBe(false);
    expect(s.blocks[0]).toMatch(/apenas informativas/);
  });

  it("lactante com outro impedimento fica bloqueada", () => {
    const e = evaluateEligibility(screening({ breastfeeding: "sim", eating_disorder: "atual" }), {
      today,
    });
    expect(planAccess(e)).toBe("bloqueado");
  });
});

describe("tendência observada", () => {
  const pts = Array.from({ length: 8 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 9, 1 + i * 5)).toISOString().slice(0, 10),
    kg: 82 - i * 0.3, // ≈ −0,42 kg/semana
  }));

  it("calcula kg/semana por média móvel e regressão", () => {
    const t = observedTrend(pts, "2026-11-06")!;
    expect(t.kgPerWeek).toBeLessThan(-0.3);
    expect(t.kgPerWeek).toBeGreaterThan(-0.6);
  });

  it("não conclui nada com menos de 3 pesagens ou menos de 14 dias", () => {
    expect(observedTrend(pts.slice(0, 2), "2026-11-06")).toBeNull();
    expect(observedTrend(pts.slice(0, 3), "2026-10-11")).toBeNull();
  });

  it("ETA observado só quando a tendência vai na direção da meta", () => {
    expect(observedEta(80, 72, -0.5)).toBe(16);
    expect(observedEta(80, 72, 0.2)).toBeNull();
  });

  it("histórico do tempo previsto tem um ponto por semana", () => {
    const h = etaHistory(pts, 72, "2026-11-06", 4);
    expect(h).toHaveLength(5);
  });
});

describe("confiança", () => {
  it("nunca é alta e cai em lactantes", () => {
    expect(
      predictionConfidence({
        weighInsLast28: 10,
        foodDaysLast14: 14,
        parameterInformed: true,
        lactante: false,
      }).level,
    ).toBe("boa");
    expect(
      predictionConfidence({
        weighInsLast28: 10,
        foodDaysLast14: 14,
        parameterInformed: true,
        lactante: true,
      }).level,
    ).toBe("baixa");
    expect(
      predictionConfidence({
        weighInsLast28: 0,
        foodDaysLast14: 0,
        parameterInformed: false,
        lactante: false,
      }).level,
    ).toBe("baixa");
  });
});
