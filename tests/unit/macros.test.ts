import { macroBreakdown, roundPercentages, sumMacros, scalePer100g } from "@/lib/calc/macros";

describe("macros", () => {
  it("converte gramas em kcal (4/4/9) e percentuais pela soma dos macros", () => {
    const r = macroBreakdown({ proteinG: 25, carbsG: 50, fatG: 10 });
    expect(r.kcal).toEqual({ protein: 100, carbs: 200, fat: 90 });
    expect(r.totalKcalFromMacros).toBe(390);
    expect(r.percent!.protein).toBeCloseTo(25.641, 2);
    expect(r.percent!.carbs).toBeCloseTo(51.282, 2);
    expect(r.percent!.fat).toBeCloseTo(23.077, 2);
    expect(r.predominant).toBe("carbs");
  });
  it("sem dados não inventa percentuais", () => {
    const r = macroBreakdown({ proteinG: 0, carbsG: 0, fatG: 0 });
    expect(r.percent).toBeNull();
    expect(r.predominant).toBeNull();
  });
  it("ignora valores negativos/NaN", () => {
    const r = macroBreakdown({ proteinG: -5, carbsG: NaN, fatG: 10 });
    expect(r.kcal).toEqual({ protein: 0, carbs: 0, fat: 90 });
    expect(r.percent!.fat).toBe(100);
  });
  it("empate total não define predominante", () => {
    expect(macroBreakdown({ proteinG: 9, carbsG: 9, fatG: 4 }).predominant).toBeNull();
  });
  it("feijão: mostra predominante sem classificar como exclusivo", () => {
    // feijão cozido aprox: P 4,8 C 13,6 G 0,5 → predominante carboidrato, mas proteína relevante
    const r = macroBreakdown({ proteinG: 4.8, carbsG: 13.6, fatG: 0.5 });
    expect(r.predominant).toBe("carbs");
    expect(r.percent!.protein).toBeGreaterThan(20);
  });
  it("arredondamento mantém soma 100", () => {
    const p = roundPercentages({ protein: 33.333, carbs: 33.333, fat: 33.334 });
    expect(p.protein + p.carbs + p.fat).toBe(100);
    const q = roundPercentages({ protein: 25.641, carbs: 51.282, fat: 23.077 });
    expect(q).toEqual({ protein: 26, carbs: 51, fat: 23 });
  });
  it("soma itens e escala por 100 g", () => {
    expect(
      sumMacros([
        { proteinG: 1, carbsG: 2, fatG: 3 },
        { proteinG: 1, carbsG: 2, fatG: 3 },
      ]),
    ).toEqual({ proteinG: 2, carbsG: 4, fatG: 6 });
    expect(scalePer100g({ kcal: 128, fiber: null }, 150)).toEqual({ kcal: 192, fiber: null });
  });
});
