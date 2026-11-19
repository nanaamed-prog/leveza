import { parseMealDescription, splitDescription } from "@/lib/nutrition/parseMeal";

const ids = (t: string) => parseMealDescription(t).map((i) => i.food?.id ?? null);

describe("descrição da refeição por texto/voz", () => {
  it("divide por vírgulas, 'e' e 'com'", () => {
    expect(splitDescription("2 ovos, 1 pão francês com manteiga e um copo de leite")).toEqual([
      "2 ovos",
      "1 pão francês",
      "manteiga",
      "um copo de leite",
    ]);
  });

  it("encontra alimentos e porções", () => {
    const r = parseMealDescription("2 ovos, 1 pão francês com manteiga e um copo de leite");
    expect(r.map((i) => i.food?.id)).toEqual([
      "ovo_cozido",
      "pao_frances",
      "manteiga",
      "leite_integral",
    ]);
    expect(r[0]!.grams).toBe(100); // 2 × 50 g
    expect(r[3]!.grams).toBe(200); // 1 copo
  });

  it("entende gramas e ml informados", () => {
    const r = parseMealDescription("150 g de arroz branco, feijão 140g, 200ml de suco de laranja");
    expect(r.map((i) => [i.food?.id, i.grams, i.confidence])).toEqual([
      ["arroz_branco", 150, "informado"],
      ["feijao_carioca", 140, "informado"],
      ["suco_laranja", 200, "informado"],
    ]);
  });

  it("entende medidas caseiras e números por extenso", () => {
    const r = parseMealDescription("duas colheres de arroz, uma concha de feijão, meia banana");
    expect(r[0]!.grams).toBe(90);
    expect(r[1]!.grams).toBe(140);
    expect(r[2]!.food?.id).toBe("banana");
    expect(r[2]!.grams).toBe(35);
  });

  it("aceita plural e texto de voz sem pontuação", () => {
    expect(ids("comi duas bananas e tres castanhas")).toEqual(["banana", "castanha_para"]);
    expect(parseMealDescription("comi duas bananas")[0]!.grams).toBe(140);
  });

  it("alimentos do dia a dia: pão de forma comum, coxinha, refrigerante", () => {
    expect(ids("2 fatias de pão de forma, 1 coxinha e 1 lata de refrigerante")).toEqual([
      "pao_forma",
      "coxinha",
      "refrigerante",
    ]);
    const r = parseMealDescription("2 fatias de pão de forma");
    expect(r[0]!.grams).toBe(50);
  });

  it("marca como não encontrado o que não está na base", () => {
    const r = parseMealDescription("1 acarajé");
    expect(r[0]!.food).toBeNull();
  });
});
