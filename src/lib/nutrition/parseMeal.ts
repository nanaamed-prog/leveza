/**
 * Interpreta uma descrição livre da refeição ("2 ovos, 1 pão francês e um copo de leite")
 * e transforma em itens com porção estimada. Funciona sem internet e sem IA.
 * Quando a IA está configurada no servidor, ela pode refinar — mas este parser é sempre o plano B.
 */

import { FOODS, bestMatch, normalize, type FoodRef } from "./foods";

export interface ParsedMealItem {
  text: string; // trecho original
  food: FoodRef | null;
  grams: number;
  /** "informado" quando a pessoa deu gramas/ml; "media" quando estimamos pela porção. */
  confidence: "informado" | "media" | "baixa";
  portionLabel: string | null;
}

const NUMBER_WORDS: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  meio: 0.5,
  meia: 0.5,
};

/** Palavra de medida → trecho a procurar nas porções do alimento. */
const UNIT_WORDS: Record<string, string> = {
  colher: "colher",
  colheres: "colher",
  concha: "concha",
  conchas: "concha",
  fatia: "fatia",
  fatias: "fatia",
  copo: "copo",
  copos: "copo",
  xicara: "xicara",
  xicaras: "xicara",
  unidade: "unidade",
  unidades: "unidade",
  pedaco: "pedaco",
  pedacos: "pedaco",
  prato: "prato",
  pratos: "prato",
  lata: "lata",
  latas: "lata",
  punhado: "punhado",
  escumadeira: "escumadeira",
  escumadeiras: "escumadeira",
  pegador: "pegador",
  pote: "pote",
  potes: "pote",
  file: "file",
  files: "file",
  bife: "bife",
  bifes: "bife",
  posta: "posta",
  quadradinho: "quadradinho",
  quadradinhos: "quadradinho",
  fio: "fio",
};

/** Divide a frase em trechos: vírgulas, ponto e vírgula, quebras de linha, " e ", " com ", " mais ". */
export function splitDescription(text: string): string[] {
  return text
    .replace(/\n/g, ",")
    .split(/[,;.]|\s+e\s+|\s+com\s+|\s+mais\s+|\s+tambem\s+|\s+também\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function matchFood(rest: string): FoodRef | null {
  const direct = bestMatch(rest);
  if (direct) return direct;
  // plural simples: "bananas" → "banana", "paes" → "pao"
  const singular = normalize(rest)
    .split(" ")
    .map((w) =>
      w.endsWith("oes") || w.endsWith("aes")
        ? w.slice(0, -3) + "ao"
        : w.endsWith("s") && w.length > 3
          ? w.slice(0, -1)
          : w,
    )
    .join(" ");
  return bestMatch(singular);
}

const FILLER = /^(hoje\s+)?(eu\s+)?(comi|tomei|bebi|almocei|jantei|lanchei|belisquei|tambem|e)\s+/;

export function parseChunk(chunk: string): ParsedMealItem {
  let n = normalize(chunk);
  while (FILLER.test(n)) n = n.replace(FILLER, "");
  const m = n.match(/^(\d+(?:[.,]\d+)?|um|uma|dois|duas|tres|quatro|cinco|seis|meio|meia)\s+(.*)$/);
  let count = 1;
  let rest = n;
  let hadNumber = false;
  if (m) {
    count = /^\d/.test(m[1]!) ? Number(m[1]!.replace(",", ".")) : NUMBER_WORDS[m[1]!]!;
    rest = m[2]!;
    hadNumber = true;
  }

  // Gramas / ml explícitos: "150 g de arroz", "200ml de leite", "arroz 150g"
  const gm = n.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|gramas?|ml|mililitros?)\b/);
  if (gm) {
    const grams = Number(gm[1]!.replace(",", "."));
    const foodText = n
      .replace(gm[0], " ")
      .replace(/^\s*(de|do|da)\s+/, "")
      .replace(/\s+/g, " ")
      .trim();
    const food = matchFood(foodText.replace(/^(de|do|da)\s+/, ""));
    return { text: chunk, food, grams, confidence: "informado", portionLabel: null };
  }

  // Unidade de medida: "2 colheres de arroz", "1 concha de feijão", "meio copo de suco"
  const words = rest.split(" ");
  const unitKey = UNIT_WORDS[words[0] ?? ""];
  let unit: string | null = null;
  if (unitKey) {
    unit = unitKey;
    rest = words
      .slice(1)
      .join(" ")
      .replace(/^(de sopa|de cha|de servir|cheia|cheias|rasa|rasas)\s+/, "")
      .replace(/^(de|do|da|dos|das)\s+/, "")
      .trim();
  }
  rest = rest.replace(/^(de|do|da|dos|das)\s+/, "").trim();

  const food = matchFood(rest);
  if (!food) return { text: chunk, food: null, grams: 0, confidence: "baixa", portionLabel: null };

  const portion = (unit && food.portions.find((p) => normalize(p.label).includes(unit!))) ||
    food.portions[0] || { label: "100 g", grams: 100 };
  const unitMismatch = Boolean(unit && !normalize(portion.label).includes(unit));
  return {
    text: chunk,
    food,
    grams: Math.round(portion.grams * count * 10) / 10,
    confidence: unitMismatch || !hadNumber ? "baixa" : "media",
    portionLabel: `${count === 0.5 ? "meia" : count} × ${portion.label}`,
  };
}

export function parseMealDescription(text: string): ParsedMealItem[] {
  return splitDescription(text).map(parseChunk);
}

export const EXAMPLE_DESCRIPTION = "2 ovos, 1 pão francês com manteiga e um copo de leite";

/** Útil para sugerir correções quando não encontramos o alimento. */
export function knownFoodNames(): string[] {
  return FOODS.map((f) => f.name);
}
