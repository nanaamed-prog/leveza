import { estimateBmr, mifflinStJeor } from "@/lib/calc/bmr";

describe("Mifflin–St Jeor", () => {
  it("fórmula de referência", () => {
    expect(mifflinStJeor(70, 175, 30, 5)).toBeCloseTo(1648.75, 2);
    expect(mifflinStJeor(60, 165, 30, -161)).toBeCloseTo(1320.25, 2);
  });
  it("sem parâmetro informado retorna faixa, não um número preciso", () => {
    const r = estimateBmr({
      weightKg: 70,
      heightCm: 170,
      ageYears: 35,
      parameter: "nao_informado",
    })!;
    expect(r.isRange).toBe(true);
    expect(r.low).toBeLessThan(r.kcal);
    expect(r.high).toBeGreaterThan(r.kcal);
  });
  it("não calcula para menores ou dados ausentes", () => {
    expect(
      estimateBmr({ weightKg: 50, heightCm: 160, ageYears: 16, parameter: "feminino" }),
    ).toBeNull();
    expect(
      estimateBmr({ weightKg: 0, heightCm: 160, ageYears: 30, parameter: "feminino" }),
    ).toBeNull();
  });
});
