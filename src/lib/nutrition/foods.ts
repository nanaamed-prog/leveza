/**
 * BASE NUTRICIONAL INICIAL (seed) — valores por 100 g (ou 100 ml para líquidos).
 *
 * IMPORTANTE (transparência de origem): estes valores são APROXIMADOS e foram montados como
 * referência de partida a partir de valores típicos publicados na TACO (NEPA/UNICAMP, 4ª ed.)
 * e no USDA FoodData Central. Antes de uso em produção, eles devem ser conferidos/importados
 * diretamente das fontes oficiais (ver docs/FORMULAS_E_FONTES.md e scripts de importação).
 * Cada item registra a fonte e a data de consulta, que vão junto com o registro do usuário.
 */

export interface FoodRef {
  id: string;
  name: string;
  aliases: string[];
  category:
    | "cereais"
    | "leguminosas"
    | "carnes_ovos"
    | "laticinios"
    | "frutas"
    | "hortalicas"
    | "tuberculos"
    | "oleos_gorduras"
    | "bebidas"
    | "doces"
    | "oleaginosas"
    | "paes_massas"
    | "preparacoes";
  per100: { kcal: number; protein: number; carbs: number; fat: number; fiber: number | null };
  unit: "g" | "ml";
  portions: { label: string; grams: number }[];
  source: string;
}

export const SEED_SOURCE = "Referência inicial Leveza (aprox. TACO/USDA) — validar";
export const SEED_CONSULTED_AT = "2026-11-19";

const f = (
  id: string,
  name: string,
  category: FoodRef["category"],
  per100: [number, number, number, number, number | null],
  portions: [string, number][] = [],
  aliases: string[] = [],
  unit: "g" | "ml" = "g",
): FoodRef => ({
  id,
  name,
  aliases,
  category,
  per100: {
    kcal: per100[0],
    protein: per100[1],
    carbs: per100[2],
    fat: per100[3],
    fiber: per100[4],
  },
  unit,
  portions: portions.map(([label, grams]) => ({ label, grams })),
  source: SEED_SOURCE,
});

export const FOODS: FoodRef[] = [
  f(
    "arroz_branco",
    "Arroz branco cozido",
    "cereais",
    [128, 2.5, 28.1, 0.2, 1.6],
    [
      ["1 colher de servir", 45],
      ["1 escumadeira", 90],
    ],
    ["arroz"],
  ),
  f(
    "arroz_integral",
    "Arroz integral cozido",
    "cereais",
    [124, 2.6, 25.8, 1.0, 2.7],
    [["1 colher de servir", 45]],
    ["arroz integral"],
  ),
  f(
    "feijao_carioca",
    "Feijão carioca cozido",
    "leguminosas",
    [76, 4.8, 13.6, 0.5, 8.5],
    [["1 concha", 140]],
    ["feijao", "feijão"],
  ),
  f(
    "feijao_preto",
    "Feijão preto cozido",
    "leguminosas",
    [77, 4.5, 14.0, 0.5, 8.4],
    [["1 concha", 140]],
    ["feijao preto"],
  ),
  f("lentilha", "Lentilha cozida", "leguminosas", [93, 6.3, 16.3, 0.5, 7.9], [["1 concha", 140]]),
  f(
    "frango_peito",
    "Peito de frango grelhado",
    "carnes_ovos",
    [159, 32.0, 0, 2.5, null],
    [["1 filé médio", 100]],
    ["frango", "frango grelhado", "peito de frango"],
  ),
  f(
    "patinho",
    "Carne bovina (patinho) grelhada",
    "carnes_ovos",
    [219, 35.9, 0, 7.3, null],
    [["1 bife médio", 100]],
    ["carne", "bife", "carne bovina"],
  ),
  f(
    "tilapia",
    "Tilápia grelhada",
    "carnes_ovos",
    [128, 26.2, 0, 2.7, null],
    [["1 filé", 120]],
    ["peixe", "tilapia"],
  ),
  f(
    "salmao",
    "Salmão grelhado",
    "carnes_ovos",
    [206, 22.1, 0, 12.4, null],
    [["1 posta", 120]],
    ["salmao"],
  ),
  f(
    "atum_agua",
    "Atum em lata (em água, drenado)",
    "carnes_ovos",
    [116, 25.5, 0, 0.8, null],
    [["1 lata drenada", 120]],
    ["atum"],
  ),
  f(
    "ovo_cozido",
    "Ovo cozido",
    "carnes_ovos",
    [146, 13.3, 0.6, 9.5, null],
    [["1 unidade", 50]],
    ["ovo", "ovos"],
  ),
  f(
    "ovo_frito",
    "Ovo frito",
    "carnes_ovos",
    [240, 15.6, 1.2, 18.6, null],
    [["1 unidade", 50]],
    ["ovo frito"],
  ),
  f(
    "pao_frances",
    "Pão francês",
    "paes_massas",
    [300, 8.0, 58.6, 3.1, 2.3],
    [["1 unidade", 50]],
    ["pao", "pão", "pãozinho"],
  ),
  f(
    "pao_integral",
    "Pão de forma integral",
    "paes_massas",
    [253, 9.4, 49.9, 3.7, 6.9],
    [["1 fatia", 25]],
    ["pao integral"],
  ),
  f(
    "pao_queijo",
    "Pão de queijo assado",
    "paes_massas",
    [363, 5.1, 34.2, 24.6, 0.6],
    [["1 unidade média", 40]],
  ),
  f(
    "macarrao",
    "Macarrão cozido",
    "paes_massas",
    [158, 5.8, 30.9, 0.9, 1.8],
    [
      ["1 prato raso", 200],
      ["1 pegador", 110],
    ],
    ["massa", "espaguete"],
  ),
  f(
    "cuscuz_milho",
    "Cuscuz de milho cozido",
    "cereais",
    [113, 2.2, 25.3, 0.7, 2.1],
    [["1 fatia", 100]],
    ["cuscuz"],
  ),
  f(
    "tapioca",
    "Tapioca (goma pronta)",
    "cereais",
    [240, 0, 60, 0, null],
    [["1 tapioca média", 60]],
    ["beiju"],
  ),
  f("aveia", "Aveia em flocos", "cereais", [394, 13.9, 66.6, 8.5, 9.1], [["1 colher de sopa", 15]]),
  f(
    "cream_cracker",
    "Biscoito cream cracker",
    "paes_massas",
    [432, 10.1, 68.7, 14.4, 2.5],
    [["1 unidade", 6]],
    ["bolacha"],
  ),
  f(
    "batata",
    "Batata inglesa cozida",
    "tuberculos",
    [52, 1.2, 11.9, 0, 1.3],
    [["1 unidade média", 140]],
    ["batata cozida", "pure"],
  ),
  f(
    "batata_doce",
    "Batata-doce cozida",
    "tuberculos",
    [77, 0.6, 18.4, 0.1, 2.2],
    [["1 pedaço médio", 120]],
    ["batata doce"],
  ),
  f(
    "mandioca",
    "Mandioca cozida",
    "tuberculos",
    [125, 0.6, 30.1, 0.3, 1.6],
    [["1 pedaço médio", 100]],
    ["aipim", "macaxeira"],
  ),
  f(
    "alface",
    "Alface",
    "hortalicas",
    [11, 1.3, 1.7, 0.2, 1.8],
    [["1 prato de sobremesa", 30]],
    ["salada", "folhas"],
  ),
  f("tomate", "Tomate", "hortalicas", [15, 1.1, 3.1, 0.2, 1.2], [["1 unidade média", 100]]),
  f(
    "cenoura",
    "Cenoura crua",
    "hortalicas",
    [34, 1.3, 7.7, 0.2, 3.2],
    [["1 colher de sopa ralada", 15]],
  ),
  f(
    "brocolis",
    "Brócolis cozido",
    "hortalicas",
    [25, 2.1, 4.4, 0.5, 3.4],
    [["1 xícara", 90]],
    ["brocolis"],
  ),
  f(
    "banana",
    "Banana-prata",
    "frutas",
    [98, 1.3, 26.0, 0.1, 2.0],
    [["1 unidade média", 70]],
    ["banana prata"],
  ),
  f(
    "maca",
    "Maçã com casca",
    "frutas",
    [56, 0.3, 15.2, 0, 1.3],
    [["1 unidade média", 130]],
    ["maca"],
  ),
  f(
    "mamao",
    "Mamão papaia",
    "frutas",
    [40, 0.5, 10.4, 0.1, 1.0],
    [["1/2 unidade", 150]],
    ["mamao"],
  ),
  f("laranja", "Laranja-pera", "frutas", [37, 1.0, 8.9, 0.1, 0.8], [["1 unidade média", 140]]),
  f("abacate", "Abacate", "frutas", [96, 1.2, 6.0, 8.4, 6.3], [["2 colheres de sopa", 45]]),
  f(
    "leite_integral",
    "Leite integral",
    "laticinios",
    [61, 2.9, 4.3, 3.2, null],
    [
      ["1 copo", 200],
      ["1 xícara", 240],
    ],
    ["leite"],
    "ml",
  ),
  f(
    "leite_desnatado",
    "Leite desnatado",
    "laticinios",
    [35, 3.4, 4.9, 0.2, null],
    [["1 copo", 200]],
    [],
    "ml",
  ),
  f(
    "iogurte_natural",
    "Iogurte natural integral",
    "laticinios",
    [51, 4.1, 1.9, 3.0, null],
    [["1 pote", 170]],
    ["iogurte"],
  ),
  f(
    "queijo_minas",
    "Queijo minas frescal",
    "laticinios",
    [264, 17.4, 3.2, 20.2, null],
    [["1 fatia", 30]],
    ["queijo branco"],
  ),
  f(
    "mucarela",
    "Queijo muçarela",
    "laticinios",
    [330, 22.6, 3.0, 25.2, null],
    [["1 fatia", 20]],
    ["mussarela", "queijo"],
  ),
  f(
    "requeijao",
    "Requeijão cremoso",
    "laticinios",
    [257, 9.6, 2.4, 23.4, null],
    [["1 colher de sopa", 30]],
  ),
  f(
    "azeite",
    "Azeite de oliva",
    "oleos_gorduras",
    [884, 0, 0, 100, null],
    [
      ["1 colher de sopa", 13],
      ["1 fio", 5],
    ],
    ["oleo", "óleo"],
  ),
  f(
    "oleo_soja",
    "Óleo de soja",
    "oleos_gorduras",
    [884, 0, 0, 100, null],
    [["1 colher de sopa", 13]],
  ),
  f(
    "manteiga",
    "Manteiga",
    "oleos_gorduras",
    [726, 0.4, 0.1, 82.4, null],
    [
      ["1 ponta de faca", 5],
      ["1 colher de chá", 8],
    ],
  ),
  f(
    "amendoim",
    "Amendoim torrado",
    "oleaginosas",
    [606, 22.5, 18.7, 54.0, 7.8],
    [["1 punhado", 25]],
  ),
  f(
    "castanha_para",
    "Castanha-do-pará",
    "oleaginosas",
    [643, 14.5, 15.1, 63.5, 7.9],
    [["1 unidade", 4]],
    ["castanha"],
  ),
  f("acucar", "Açúcar", "doces", [387, 0, 99.5, 0, null], [["1 colher de chá", 5]], ["acucar"]),
  f(
    "chocolate_leite",
    "Chocolate ao leite",
    "doces",
    [540, 7.2, 59.6, 30.3, 2.2],
    [["1 quadradinho", 10]],
    ["chocolate"],
  ),
  f(
    "cafe",
    "Café coado sem açúcar",
    "bebidas",
    [2, 0.3, 0, 0, null],
    [["1 xícara", 100]],
    ["cafe"],
    "ml",
  ),
  f(
    "suco_laranja",
    "Suco de laranja natural",
    "bebidas",
    [45, 0.7, 10.4, 0.2, 0.2],
    [["1 copo", 250]],
    ["suco"],
    "ml",
  ),
  f(
    "refrigerante",
    "Refrigerante tipo cola",
    "bebidas",
    [42, 0, 10.6, 0, null],
    [
      ["1 lata", 350],
      ["1 copo", 250],
    ],
    ["refri", "coca"],
    "ml",
  ),
];

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Busca simples: todas as palavras da consulta presentes no nome ou apelidos. */
export function searchFoods(query: string, limit = 12): FoodRef[] {
  const q = normalize(query);
  if (!q) return FOODS.slice(0, limit);
  const words = q.split(" ");
  const scored = FOODS.map((food) => {
    const hay = [food.name, ...food.aliases].map(normalize);
    const all = hay.join(" ");
    if (!words.every((w) => all.includes(w))) return null;
    const score = hay.some((h) => h === q) ? 3 : hay.some((h) => h.startsWith(q)) ? 2 : 1;
    return { food, score };
  }).filter((x): x is { food: FoodRef; score: number } => x !== null);
  scored.sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name));
  return scored.slice(0, limit).map((x) => x.food);
}

export function bestMatch(name: string): FoodRef | null {
  const exact = searchFoods(name, 1)[0];
  if (exact) return exact;
  // tenta palavra a palavra (a mais longa primeiro)
  const words = normalize(name)
    .split(" ")
    .filter((w) => w.length > 3)
    .sort((a, b) => b.length - a.length);
  for (const w of words) {
    const hit = searchFoods(w, 1)[0];
    if (hit) return hit;
  }
  return null;
}

export function nutrientsFor(food: FoodRef, grams: number) {
  const k = Math.max(0, grams) / 100;
  return {
    kcal: food.per100.kcal * k,
    protein_g: food.per100.protein * k,
    carbs_g: food.per100.carbs * k,
    fat_g: food.per100.fat * k,
    fiber_g: food.per100.fiber === null ? null : food.per100.fiber * k,
  };
}
