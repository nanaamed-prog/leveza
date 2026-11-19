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
  // ---- Alimentos do dia a dia (não só “de dieta”) ----
  f(
    "pao_forma",
    "Pão de forma tradicional",
    "paes_massas",
    [253, 12.0, 44.1, 2.7, 2.3],
    [
      ["1 fatia", 25],
      ["2 fatias", 50],
    ],
    ["pao de forma", "pao de forma comum", "pao de forma branco", "pao de sanduiche"],
  ),
  f(
    "bisnaguinha",
    "Pão de leite / bisnaguinha",
    "paes_massas",
    [300, 8.0, 54.0, 5.5, 2.0],
    [["1 unidade", 20]],
    ["pao de leite", "bisnaga"],
  ),
  f(
    "misto_quente",
    "Misto quente",
    "preparacoes",
    [260, 13.0, 27.0, 11.0, 1.2],
    [["1 unidade", 110]],
    ["misto", "queijo quente"],
  ),
  f(
    "cachorro_quente",
    "Cachorro-quente",
    "preparacoes",
    [247, 10.0, 24.0, 13.0, 1.0],
    [["1 unidade", 150]],
    ["hot dog", "cachorro quente"],
  ),
  f(
    "hamburguer",
    "Hambúrguer (sanduíche simples)",
    "preparacoes",
    [254, 12.6, 30.0, 9.4, 1.5],
    [["1 unidade", 110]],
    ["hamburger", "x burguer", "lanche"],
  ),
  f(
    "pizza_mucarela",
    "Pizza de muçarela",
    "preparacoes",
    [266, 11.4, 33.0, 9.7, 2.3],
    [["1 fatia", 100]],
    ["pizza"],
  ),
  f(
    "lasanha",
    "Lasanha à bolonhesa",
    "preparacoes",
    [150, 8.0, 15.0, 6.5, 1.0],
    [["1 pedaço", 250]],
    ["lasanha"],
  ),
  f(
    "strogonoff",
    "Strogonoff de frango",
    "preparacoes",
    [157, 17.6, 2.6, 8.0, null],
    [["1 concha", 130]],
    ["estrogonofe", "strogonoff"],
  ),
  f("feijoada", "Feijoada", "preparacoes", [117, 8.7, 11.6, 6.5, 5.1], [["1 concha", 180]], []),
  f(
    "farofa",
    "Farofa pronta",
    "preparacoes",
    [406, 2.1, 80.3, 9.1, 7.8],
    [["1 colher de sopa", 15]],
    [],
  ),
  f(
    "pure_batata",
    "Purê de batata",
    "preparacoes",
    [100, 2.0, 15.0, 3.5, 1.3],
    [["1 colher de servir", 60]],
    ["pure"],
  ),
  f(
    "macarrao_instantaneo",
    "Macarrão instantâneo preparado",
    "preparacoes",
    [190, 4.0, 26.0, 7.5, 1.0],
    [["1 pacote preparado", 250]],
    ["miojo", "lamen"],
  ),
  f(
    "omelete",
    "Omelete simples",
    "carnes_ovos",
    [154, 10.6, 0.7, 11.7, null],
    [["1 unidade (2 ovos)", 120]],
    ["omelete", "ovo mexido"],
  ),
  f(
    "carne_moida",
    "Carne moída refogada",
    "carnes_ovos",
    [212, 26.7, 0, 10.9, null],
    [["1 colher de servir", 60]],
    ["carne moida"],
  ),
  f(
    "frango_frito",
    "Frango frito (coxa/sobrecoxa)",
    "carnes_ovos",
    [250, 26.0, 4.0, 14.0, null],
    [["1 pedaço", 100]],
    ["frango frito"],
  ),
  f(
    "linguica",
    "Linguiça toscana grelhada",
    "carnes_ovos",
    [296, 23.2, 0, 21.3, null],
    [["1 gomo", 60]],
    ["linguica"],
  ),
  f("salsicha", "Salsicha", "carnes_ovos", [257, 13.0, 3.0, 21.5, null], [["1 unidade", 50]], []),
  f("bacon", "Bacon frito", "carnes_ovos", [540, 37.0, 1.4, 42.0, null], [["1 fatia", 10]], []),
  f("presunto", "Presunto", "carnes_ovos", [128, 14.5, 2.1, 6.8, null], [["1 fatia", 15]], []),
  f("mortadela", "Mortadela", "carnes_ovos", [269, 12.0, 5.8, 21.6, null], [["1 fatia", 15]], []),
  f(
    "queijo_prato",
    "Queijo prato",
    "laticinios",
    [360, 22.7, 1.9, 29.1, null],
    [["1 fatia", 20]],
    ["queijo amarelo"],
  ),
  f(
    "margarina",
    "Margarina",
    "oleos_gorduras",
    [596, 0, 0, 67.0, null],
    [
      ["1 ponta de faca", 5],
      ["1 colher de chá", 8],
    ],
    [],
  ),
  f(
    "maionese",
    "Maionese",
    "oleos_gorduras",
    [302, 0.6, 7.9, 30.5, null],
    [["1 colher de sopa", 15]],
    [],
  ),
  f(
    "batata_frita",
    "Batata frita",
    "tuberculos",
    [267, 5.0, 35.6, 13.1, 3.0],
    [
      ["1 porção pequena", 80],
      ["1 porção média", 120],
    ],
    ["fritas"],
  ),
  f(
    "mandioca_frita",
    "Mandioca frita",
    "tuberculos",
    [300, 1.4, 50.3, 11.2, 1.9],
    [["1 porção", 100]],
    ["aipim frito", "macaxeira frita"],
  ),
  f(
    "coxinha",
    "Coxinha de frango",
    "preparacoes",
    [283, 9.6, 34.5, 11.8, 1.5],
    [["1 unidade média", 80]],
    ["salgado"],
  ),
  f(
    "pastel",
    "Pastel de queijo frito",
    "preparacoes",
    [303, 9.0, 33.0, 15.0, 1.0],
    [["1 unidade média", 80]],
    ["pastel"],
  ),
  f(
    "esfiha",
    "Esfiha de carne",
    "preparacoes",
    [300, 11.0, 40.0, 10.0, 2.0],
    [["1 unidade", 80]],
    ["esfirra"],
  ),
  f(
    "biscoito_recheado",
    "Biscoito recheado",
    "doces",
    [472, 6.4, 70.5, 19.6, 3.0],
    [
      ["1 unidade", 15],
      ["3 unidades", 45],
    ],
    ["bolacha recheada"],
  ),
  f(
    "biscoito_maisena",
    "Biscoito maisena / maria",
    "doces",
    [443, 8.1, 75.2, 12.0, 2.1],
    [["1 unidade", 5]],
    ["bolacha maria", "maizena"],
  ),
  f(
    "bolo_simples",
    "Bolo simples caseiro",
    "doces",
    [330, 5.0, 50.0, 12.0, 1.0],
    [["1 fatia", 60]],
    ["bolo", "bolo de fuba", "bolo de laranja"],
  ),
  f(
    "bolo_chocolate",
    "Bolo de chocolate",
    "doces",
    [410, 6.2, 54.7, 18.5, 1.4],
    [["1 fatia", 60]],
    [],
  ),
  f("brigadeiro", "Brigadeiro", "doces", [403, 4.0, 63.0, 15.0, 1.0], [["1 unidade", 20]], []),
  f(
    "sorvete",
    "Sorvete de creme",
    "doces",
    [207, 3.5, 24.0, 11.0, null],
    [["1 bola", 60]],
    ["sorvete"],
  ),
  f(
    "acai",
    "Açaí na tigela (com xarope)",
    "doces",
    [110, 0.7, 21.5, 3.7, 2.6],
    [["1 tigela média", 300]],
    ["acai"],
  ),
  f(
    "leite_condensado",
    "Leite condensado",
    "doces",
    [313, 7.7, 57.0, 6.7, null],
    [["1 colher de sopa", 20]],
    [],
  ),
  f(
    "pipoca",
    "Pipoca com óleo",
    "cereais",
    [448, 9.9, 70.3, 15.9, 14.3],
    [["1 saco médio", 30]],
    ["pipoca"],
  ),
  f(
    "salgadinho",
    "Salgadinho de milho (pacote)",
    "doces",
    [520, 6.0, 60.0, 28.0, 3.0],
    [["1 pacote pequeno", 25]],
    ["chips", "salgadinho"],
  ),
  f(
    "granola",
    "Granola",
    "cereais",
    [421, 10.0, 66.0, 13.0, 7.0],
    [["2 colheres de sopa", 20]],
    [],
  ),
  f(
    "iogurte_adocado",
    "Iogurte de fruta (adoçado)",
    "laticinios",
    [95, 3.0, 15.0, 2.5, null],
    [["1 pote", 170]],
    ["iogurte de morango", "danone", "iogurte com sabor"],
  ),
  f(
    "achocolatado",
    "Achocolatado em pó",
    "bebidas",
    [401, 4.2, 91.0, 2.2, 3.9],
    [["1 colher de sopa", 15]],
    ["nescau", "toddy"],
  ),
  f(
    "cafe_leite",
    "Café com leite e açúcar",
    "bebidas",
    [58, 2.0, 8.0, 2.0, null],
    [["1 xícara", 200]],
    ["cafe com leite", "pingado"],
    "ml",
  ),
  f(
    "suco_caixinha",
    "Suco de caixinha (néctar)",
    "bebidas",
    [50, 0.2, 12.5, 0, null],
    [
      ["1 copo", 250],
      ["1 caixinha", 200],
    ],
    ["suco de caixa", "nectar"],
    "ml",
  ),
  f("uva", "Uva", "frutas", [53, 0.7, 13.6, 0.2, 0.9], [["1 cacho pequeno", 100]], []),
  f("melancia", "Melancia", "frutas", [33, 0.9, 8.1, 0, 0.1], [["1 fatia média", 200]], []),
  f("abacaxi", "Abacaxi", "frutas", [48, 0.9, 12.3, 0.1, 1.0], [["1 fatia", 75]], []),
  f("manga", "Manga", "frutas", [64, 0.4, 16.7, 0.3, 1.6], [["1 unidade média", 200]], []),
  f("morango", "Morango", "frutas", [30, 0.9, 6.8, 0.3, 1.7], [["1 xícara", 150]], []),
  f("pepino", "Pepino", "hortalicas", [10, 0.9, 2.0, 0, 1.1], [["1/2 unidade", 100]], []),
  f(
    "beterraba",
    "Beterraba cozida",
    "hortalicas",
    [32, 1.3, 7.2, 0.1, 1.9],
    [["2 colheres de sopa", 40]],
    [],
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
