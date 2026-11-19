export interface HabitDef {
  key: string;
  label: string;
  optional?: boolean;
}

/** Hábitos-base do Plano 5+2 (cinco dias de prioridade + dois de flexibilidade). */
export const CORE_HABITS: HabitDef[] = [
  { key: "minimamente_processados", label: "Priorizei alimentos minimamente processados" },
  { key: "frutas", label: "Comi frutas" },
  { key: "legumes", label: "Comi legumes e verduras" },
  { key: "fibras", label: "Incluí fibras (feijão, integrais, sementes)" },
  { key: "proteinas", label: "Incluí proteína nas principais refeições" },
];

/** Metas opcionais — a pessoa escolhe quais quer acompanhar. */
export const OPTIONAL_HABITS: HabitDef[] = [
  { key: "menos_acucar", label: "Reduzi açúcar adicionado", optional: true },
  { key: "menos_farinha_refinada", label: "Reduzi farinha branca/refinada", optional: true },
  { key: "sem_refrigerante", label: "Troquei o refrigerante por outra bebida", optional: true },
  {
    key: "leite_ajuste",
    label: "Segui minha escolha sobre leite (reduzir ou substituir)",
    optional: true,
  },
];

export const SUBSTITUTIONS = [
  "Refrigerante → água com gás e limão, chá gelado sem açúcar ou suco natural diluído",
  "Pão branco → pão integral, cuscuz de milho, tapioca com recheio de proteína ou ovos",
  "Biscoito recheado → fruta com aveia, iogurte natural com fruta, pipoca de panela",
  "Açúcar no café → reduzir aos poucos, canela, ou adoçar menos a cada semana",
  "Macarrão branco → misturar com legumes, versão integral ou meia porção com feijão",
];

export const MILK_NOTE =
  "Leite não é proibido. Se quiser reduzir ou substituir (por preferência, intolerância ou orientação clínica), lembre de manter fontes de cálcio e proteína — iogurte, queijos, bebidas vegetais fortificadas, folhas verde-escuras, sardinha, tofu. Na dúvida, converse com nutricionista.";
