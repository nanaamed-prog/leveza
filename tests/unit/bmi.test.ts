import { calculateBmi, bmiCategory, BmiInputError, healthyWeightRange } from "@/lib/calc/bmi";

describe("IMC adulto", () => {
  it("calcula peso/altura²", () => {
    expect(calculateBmi(70, 175, 30).value).toBeCloseTo(22.857, 3);
  });
  it.each([
    [18.49, "baixo_peso"],
    [18.5, "saudavel"],
    [24.99, "saudavel"],
    [25, "sobrepeso"],
    [29.99, "sobrepeso"],
    [30, "obesidade"],
  ])("limite %s → %s", (v, cat) => {
    expect(bmiCategory(v)).toBe(cat);
  });
  it("classifica pelo valor exato, não pelo arredondado", () => {
    // 24,96 é exibido como "25,0" mas ainda é faixa saudável
    const h = 160;
    const w = 24.96 * 1.6 * 1.6;
    const r = calculateBmi(w, h, 40);
    expect(r.display).toBe("25,0");
    expect(r.category).toBe("saudavel");
  });
  it("subclasses de obesidade", () => {
    expect(calculateBmi(31 * 2.89, 170, 30).obesityClass).toBe(1);
    expect(calculateBmi(36 * 2.89, 170, 30).obesityClass).toBe(2);
    expect(calculateBmi(41 * 2.89, 170, 30).obesityClass).toBe(3);
  });
  it("não aplica categorias adultas a menores", () => {
    expect(() => calculateBmi(50, 160, 17)).toThrow(BmiInputError);
  });
  it("rejeita entradas inválidas", () => {
    expect(() => calculateBmi(0, 170, 30)).toThrow();
    expect(() => calculateBmi(70, 0, 30)).toThrow();
    expect(() => calculateBmi(NaN, 170, 30)).toThrow();
    expect(() => calculateBmi(70, 170, NaN)).toThrow();
  });
  it("faixa populacional para a altura", () => {
    const r = healthyWeightRange(170);
    expect(r.min).toBeCloseTo(53.465, 2);
    expect(r.max).toBeCloseTo(71.961, 2);
  });
});
