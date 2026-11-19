/**
 * Meu intestino — registro educativo, sem diagnóstico.
 * Frequência considerada comum em adultos varia bastante (de cerca de 3 vezes por dia a 3 vezes
 * por semana). A escala de Bristol descreve a forma das fezes em 7 tipos.
 */

export const BRISTOL = [
  { type: 1, label: "Pedaços duros e separados", hint: "difíceis de passar", group: "seco" },
  { type: 2, label: "Formato alongado, mas encaroçado", hint: "", group: "seco" },
  { type: 3, label: "Alongado, com rachaduras na superfície", hint: "", group: "referencia" },
  { type: 4, label: "Alongado, liso e macio", hint: "", group: "referencia" },
  { type: 5, label: "Pedaços macios com bordas definidas", hint: "", group: "solto" },
  { type: 6, label: "Pedaços moles, pastosos", hint: "bordas irregulares", group: "solto" },
  { type: 7, label: "Líquido, sem partes sólidas", hint: "", group: "solto" },
] as const;

export const BRISTOL_GROUP_TEXT = {
  seco: "Tende a mais ressecado. Água, fibras e movimento costumam ajudar.",
  referencia: "Faixa geralmente considerada de referência.",
  solto: "Tende a mais solto. Hidrate-se; se durar mais de 2 dias, converse com um profissional.",
} as const;

export function bristolGroup(t: number | null): keyof typeof BRISTOL_GROUP_TEXT | null {
  if (!t) return null;
  return BRISTOL.find((b) => b.type === t)?.group ?? null;
}

/** Horas desde o último registro (null se não houver). */
export function hoursSinceLast(times: number[], now: number): number | null {
  if (times.length === 0) return null;
  return (now - Math.max(...times)) / 3_600_000;
}

export function describeSince(hours: number | null): string {
  if (hours === null) return "Sem registros";
  if (hours < 24) return "Nas últimas 24 h";
  const d = Math.floor(hours / 24);
  return d === 1 ? "Há 1 dia" : `Há ${d} dias`;
}

/** Nota gentil, sem diagnóstico, quando há vários dias sem registro. */
export function gapNote(hours: number | null): string | null {
  if (hours === null || hours < 72) return null;
  return "Faz 3 dias ou mais desde o último registro. Se não foi só esquecimento, capriche em água, fibras e movimento. Se vier com dor, inchaço forte ou se repetir com frequência, procure um profissional de saúde.";
}

export const BOWEL_TIPS = [
  "Fibras ao longo do dia: feijão, frutas com casca, verduras, aveia e integrais.",
  "Água conforme a sede — as fibras funcionam melhor com hidratação.",
  "Movimento diário, mesmo uma caminhada curta, estimula o intestino.",
  "Não segure a vontade e tente manter horários parecidos, com calma.",
  "Apoiar os pés num banquinho baixo pode deixar a posição mais confortável.",
];

export const BOWEL_WARNING_SIGNS = [
  "Sangue nas fezes ou fezes muito escuras",
  "Dor abdominal forte ou barriga muito inchada",
  "Mudança no hábito intestinal que dura mais de algumas semanas",
  "Diarreia por mais de 2 dias, com febre ou sinais de desidratação",
  "Perda de peso sem explicação",
];
