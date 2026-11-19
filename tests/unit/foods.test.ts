import { searchFoods, bestMatch, nutrientsFor, FOODS } from "@/lib/nutrition/foods";
import { sniffImageType } from "@/lib/server/vision";

vi.mock("server-only", () => ({}));

describe("base nutricional", () => {
  it("busca sem acento e por apelido", () => {
    expect(searchFoods("feijao")[0]!.id).toMatch(/feijao/);
    expect(searchFoods("aipim")[0]!.id).toBe("mandioca");
  });
  it("associa nomes vindos da IA", () => {
    expect(bestMatch("arroz branco cozido")!.id).toBe("arroz_branco");
    expect(bestMatch("peito de frango grelhado")!.id).toBe("frango_peito");
    expect(bestMatch("xyzabc")).toBeNull();
  });
  it("todo alimento registra fonte e valores coerentes", () => {
    for (const f of FOODS) {
      expect(f.source).toBeTruthy();
      const fromMacros = f.per100.protein * 4 + f.per100.carbs * 4 + f.per100.fat * 9;
      // tolerância: fibras, álcool e fatores específicos
      expect(Math.abs(fromMacros - f.per100.kcal)).toBeLessThan(Math.max(25, f.per100.kcal * 0.2));
    }
  });
  it("escala nutrientes pela porção", () => {
    const arroz = FOODS.find((f) => f.id === "arroz_branco")!;
    expect(nutrientsFor(arroz, 150).kcal).toBeCloseTo(192);
  });
});

describe("validação de upload", () => {
  it("reconhece tipo real pelos bytes", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(
      sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])),
    ).toBe("image/png");
    expect(sniffImageType(new TextEncoder().encode("<?php echo 1; ?>"))).toBeNull();
  });
});
