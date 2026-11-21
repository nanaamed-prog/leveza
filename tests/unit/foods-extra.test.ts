import { describe, expect, it } from "vitest";
import { FOODS, searchFoods } from "@/lib/nutrition/foods";
import { parseMealDescription } from "@/lib/nutrition/parseMeal";

describe("base ampliada de alimentos e bebidas", () => {
  it("tem mais de 300 itens, sem ids repetidos", () => {
    expect(FOODS.length).toBeGreaterThan(300);
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
  });
  it("encontra bebidas comuns pela busca", () => {
    for (const q of [
      "cerveja",
      "vinho",
      "água de coco",
      "chá",
      "cappuccino",
      "energético",
      "leite de aveia",
    ])
      expect(searchFoods(q).length, q).toBeGreaterThan(0);
  });
  it("líquidos usam ml", () => {
    for (const id of ["cerveja", "agua_coco", "suco_uva", "cha"])
      expect(FOODS.find((f) => f.id === id)?.unit).toBe("ml");
  });
  it("entende pratos e bebidas novos na descrição", () => {
    const ids = parseMealDescription("1 x-burguer, 1 lata de cerveja e 1 taça de vinho tinto").map(
      (r) => r.food?.id,
    );
    expect(ids).toEqual(["x_burguer", "cerveja", "vinho_tinto"]);
  });
});
