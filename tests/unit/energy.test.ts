import {
  computeDayEnergy,
  activityIncrementKcal,
  describeBalance,
  energyBalance,
} from "@/lib/calc/energy";
import { SLEEP_MET } from "@/lib/calc/met";

const H = 3_600_000;
const day = { dayStart: 0, dayEnd: 24 * H };
const base = {
  ...day,
  now: 24 * H,
  weightKg: 70,
  bmrKcal: null,
  baselineMet: 1.5,
  sleeps: [],
  activities: [],
};

describe("gasto energético sem dupla contagem", () => {
  it("dia sem registros = MET basal × peso × 24 h", () => {
    const r = computeDayEnergy(base);
    expect(r.projected24h.kcal).toBeCloseTo(1.5 * 70 * 24, 6);
    expect(r.projected24h.minutes.baseline).toBeCloseTo(1440, 6);
  });

  it("sono SUBSTITUI o tempo basal, não é somado", () => {
    const r = computeDayEnergy({ ...base, sleeps: [{ id: "s", start: 0, end: 8 * H }] });
    const expected = (SLEEP_MET * 8 + 1.5 * 16) * 70;
    expect(r.projected24h.kcal).toBeCloseTo(expected, 6);
    const m = r.projected24h.minutes;
    expect(m.sleep + m.activity + m.baseline).toBeCloseTo(1440, 6);
  });

  it("atividade substitui o basal do intervalo (o MET já inclui repouso)", () => {
    const r = computeDayEnergy({
      ...base,
      activities: [{ id: "a", start: 10 * H, end: 11 * H, met: 3.5 }],
    });
    expect(r.projected24h.kcal).toBeCloseTo((1.5 * 23 + 3.5 * 1) * 70, 6);
    // O acréscimo real no dia é (3,5 − 1,5) × 70 × 1 h
    expect(r.projected24h.kcal - 1.5 * 70 * 24).toBeCloseTo(
      activityIncrementKcal(3.5, 1.5, 70, 60),
      6,
    );
  });

  it("atividade sobreposta ao sono: conta uma única vez, usando o maior MET, e avisa", () => {
    const r = computeDayEnergy({
      ...base,
      sleeps: [{ id: "s", start: 0, end: 8 * H }],
      activities: [{ id: "a", start: 7 * H, end: 9 * H, met: 4 }],
    });
    const expected = (SLEEP_MET * 7 + 4 * 2 + 1.5 * 15) * 70;
    expect(r.projected24h.kcal).toBeCloseTo(expected, 6);
    expect(r.overlaps).toEqual([{ a: "s", b: "a", minutes: 60 }]);
    const m = r.projected24h.minutes;
    expect(m.sleep + m.activity + m.baseline).toBeCloseTo(1440, 6);
  });

  it("duas atividades no mesmo horário não somam", () => {
    const r = computeDayEnergy({
      ...base,
      activities: [
        { id: "a", start: 10 * H, end: 12 * H, met: 3 },
        { id: "b", start: 11 * H, end: 13 * H, met: 6 },
      ],
    });
    const expected = (3 * 1 + 6 * 2 + 1.5 * 21) * 70;
    expect(r.projected24h.kcal).toBeCloseTo(expected, 6);
    expect(r.projected24h.minutes.activity).toBeCloseTo(180, 6);
  });

  it("sono que atravessa a meia-noite é recortado ao dia", () => {
    const r = computeDayEnergy({ ...base, sleeps: [{ id: "s", start: -2 * H, end: 6 * H }] });
    expect(r.projected24h.minutes.sleep).toBeCloseTo(360, 6);
  });

  it("minutos acordado na cama usam MET 1,0", () => {
    const r = computeDayEnergy({
      ...base,
      sleeps: [{ id: "s", start: 0, end: 8 * H, awakeMinutes: 60 }],
    });
    expect(r.projected24h.kcal).toBeCloseTo((SLEEP_MET * 7 + 1.0 * 1 + 1.5 * 16) * 70, 6);
  });

  it("separa gasto até agora da projeção de 24 h", () => {
    const r = computeDayEnergy({ ...base, now: 12 * H });
    expect(r.elapsed.kcal).toBeCloseTo(1.5 * 70 * 12, 6);
    expect(r.projected24h.kcal).toBeCloseTo(1.5 * 70 * 24, 6);
  });

  it("fator individual ajusta pela TMB e gera faixa", () => {
    const r = computeDayEnergy({ ...base, bmrKcal: 1512, bmrLow: 1360.8, bmrHigh: 1663.2 });
    expect(r.factor).toBeCloseTo(1512 / (70 * 24), 6);
    expect(r.projected24h.low).toBeLessThan(r.projected24h.kcal);
    expect(r.projected24h.high).toBeGreaterThan(r.projected24h.kcal);
  });

  it("dia de 25 h (fim do horário de verão) é tratado pelo intervalo real", () => {
    const r = computeDayEnergy({ ...base, dayEnd: 25 * H, now: 25 * H });
    expect(r.projected24h.minutes.baseline).toBeCloseTo(1500, 6);
  });

  it("ignora registros inválidos", () => {
    const r = computeDayEnergy({
      ...base,
      activities: [{ id: "x", start: 5 * H, end: 4 * H, met: 8 }],
    });
    expect(r.projected24h.kcal).toBeCloseTo(1.5 * 70 * 24, 6);
  });

  it("saldo e texto neutro", () => {
    expect(energyBalance(1800, 2000)).toBe(-200);
    expect(describeBalance(-200)).toBe("200 kcal abaixo do gasto estimado");
    expect(describeBalance(30)).toBe("Consumo próximo do gasto estimado");
  });
});
