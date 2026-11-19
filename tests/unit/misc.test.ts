import { effectiveSleepMinutes, validateSleep, bedtimeRegularity } from "@/lib/calc/sleep";
import {
  movingAverage,
  assessWeightGoal,
  suggestIntakeTarget,
  changeFromBaseline,
} from "@/lib/calc/weight";
import { fastingState, formatHms } from "@/lib/calc/fasting";
import { dayRange, localDateKey, startOfWeek, fromLocalInput, toLocalInput } from "@/lib/dates";

const H = 3_600_000;

describe("sono", () => {
  it("duração efetiva desconta despertares", () => {
    expect(effectiveSleepMinutes({ start: 0, end: 8 * H, awakeMinutes: 45 })).toBe(435);
  });
  it("valida horários", () => {
    expect(validateSleep({ start: 8 * H, end: 0, awakeMinutes: 0 })).not.toBeNull();
    expect(validateSleep({ start: 0, end: H, awakeMinutes: 90 })).not.toBeNull();
    expect(validateSleep({ start: 0, end: 7 * H, awakeMinutes: 10 })).toBeNull();
  });
  it("regularidade circular trata horários ao redor da meia-noite", () => {
    const sd = bedtimeRegularity([1430, 10, 1435, 5])!;
    expect(sd).toBeLessThan(15);
  });
});

describe("peso", () => {
  it("média móvel de 7 dias", () => {
    const r = movingAverage([
      { date: "2026-11-01", kg: 80 },
      { date: "2026-11-03", kg: 79 },
      { date: "2026-11-10", kg: 78 },
    ]);
    expect(r[1]!.avg).toBeCloseTo(79.5);
    expect(r[2]!.avg).toBeCloseTo(78); // 01 e 03 fora da janela
    expect(
      changeFromBaseline([
        { date: "2026-11-01", kg: 80 },
        { date: "2026-11-10", kg: 78 },
      ])!.delta,
    ).toBe(-2);
  });
  it("meta com IMC < 18,5 é bloqueada", () => {
    expect(
      assessWeightGoal({ goal: "perder", currentKg: 60, targetKg: 45, heightCm: 170 }).level,
    ).toBe("bloqueada");
  });
  it("ritmo acima de 1%/semana gera atenção", () => {
    expect(
      assessWeightGoal({
        goal: "perder",
        currentKg: 80,
        targetKg: 72,
        heightCm: 170,
        weeklyRateKg: 1.2,
      }).level,
    ).toBe("atencao");
  });
  it("sugestão de meta nunca abaixo da TMB/1.200 e só se déficit permitido", () => {
    expect(
      suggestIntakeTarget({
        goal: "perder",
        projectedExpenditure: 1500,
        bmr: 1400,
        deficitAllowed: true,
      })!.kcal,
    ).toBe(1400);
    expect(
      suggestIntakeTarget({
        goal: "perder",
        projectedExpenditure: 1300,
        bmr: null,
        deficitAllowed: true,
      })!.kcal,
    ).toBe(1200);
    expect(
      suggestIntakeTarget({
        goal: "perder",
        projectedExpenditure: 2200,
        bmr: 1500,
        deficitAllowed: false,
      }),
    ).toBeNull();
  });
});

describe("jejum", () => {
  it("progresso e término previsto", () => {
    const s = fastingState(0, 16, 8 * H);
    expect(s.progress).toBe(0.5);
    expect(s.expectedEnd).toBe(16 * H);
    expect(formatHms(s.remainingMs)).toBe("08:00:00");
    expect(fastingState(0, 12, 13 * H).reachedTarget).toBe(true);
  });
});

describe("datas e fusos", () => {
  it("dia local em São Paulo (UTC−3)", () => {
    const r = dayRange("2026-11-19", "America/Sao_Paulo");
    expect(new Date(r.start).toISOString()).toBe("2026-11-19T03:00:00.000Z");
    expect(r.end - r.start).toBe(24 * H);
    expect(localDateKey(Date.parse("2026-11-20T02:30:00Z"), "America/Sao_Paulo")).toBe(
      "2026-11-19",
    );
  });
  it("dia com horário de verão (Nova York, 2 nov 2025 tem 25 h)", () => {
    const r = dayRange("2025-11-02", "America/New_York");
    expect(r.end - r.start).toBe(25 * H);
  });
  it("semana começa na segunda por padrão", () => {
    expect(startOfWeek("2026-11-19")).toBe("2026-11-16");
    expect(startOfWeek("2026-11-19", 0)).toBe("2026-11-15");
  });
  it("ida e volta do input local", () => {
    const ms = fromLocalInput("2026-11-19T07:30", "America/Sao_Paulo");
    expect(toLocalInput(ms, "America/Sao_Paulo")).toBe("2026-11-19T07:30");
  });
});

import { cumulativeBalanceEstimate, KCAL_PER_KG } from "@/lib/calc/weight";

describe("saldo acumulado e peso estimado (7.700 kcal ≈ 1 kg)", () => {
  it("soma só dias completos com refeição e converte em kg", () => {
    const r = cumulativeBalanceEstimate(
      [
        { date: "2026-11-15", balance: -500 },
        { date: "2026-11-16", balance: null }, // sem refeição registrada
        { date: "2026-11-17", balance: -300 },
        { date: "2026-11-18", balance: 200 },
        { date: "2026-11-19", balance: -1500 }, // hoje, em andamento
      ],
      "2026-11-19",
    );
    expect(r.days).toBe(3);
    expect(r.totalBalanceKcal).toBe(-600);
    expect(r.estimatedKg).toBeCloseTo(-600 / KCAL_PER_KG, 6);
    expect(r.averageDailyKcal).toBe(-200);
  });
  it("7.700 kcal de déficit ≈ −1 kg", () => {
    expect(
      cumulativeBalanceEstimate([{ date: "2026-11-01", balance: -7700 }], "2026-11-19").estimatedKg,
    ).toBe(-1);
  });
  it("sem dias válidos", () => {
    expect(cumulativeBalanceEstimate([], "2026-11-19").averageDailyKcal).toBeNull();
  });
});

import { kcalTargetFloor } from "@/lib/calc/weight";

describe("piso da meta de calorias", () => {
  it("com déficit permitido: TMB ou 1.200", () => {
    expect(
      kcalTargetFloor({ deficitAllowed: true, bmrLow: 1350, projectedExpenditure: 2100 }),
    ).toBe(1350);
    expect(
      kcalTargetFloor({ deficitAllowed: true, bmrLow: null, projectedExpenditure: null }),
    ).toBe(1200);
  });
  it("sem déficit (ex.: lactante): não abaixo do gasto estimado", () => {
    expect(
      kcalTargetFloor({ deficitAllowed: false, bmrLow: 1350, projectedExpenditure: 2234 }),
    ).toBe(2230);
    expect(
      kcalTargetFloor({ deficitAllowed: false, bmrLow: null, projectedExpenditure: null }),
    ).toBe(1200);
  });
});
