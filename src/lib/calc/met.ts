/**
 * Catálogo de atividades com MET aproximado (equivalente metabólico).
 * Valores de referência inspirados no Compendium of Physical Activities (Ainsworth et al.,
 * 2011; atualização 2024). São médias populacionais: o gasto real varia por pessoa,
 * técnica, terreno, condicionamento e ambiente.
 *
 * O MET já inclui o gasto de repouso (MET 1 ≈ repouso). Por isso, no cálculo diário o período
 * da atividade SUBSTITUI o período de repouso — nunca é somado por cima.
 */

export type Intensity = "leve" | "moderada" | "vigorosa";

export interface ActivityType {
  id: string;
  label: string;
  met: Record<Intensity, number>;
}

export const ACTIVITY_TYPES: ActivityType[] = [
  { id: "caminhada", label: "Caminhada", met: { leve: 2.8, moderada: 3.5, vigorosa: 4.3 } },
  { id: "corrida", label: "Corrida", met: { leve: 7.0, moderada: 8.3, vigorosa: 10.5 } },
  { id: "musculacao", label: "Musculação", met: { leve: 3.0, moderada: 3.5, vigorosa: 6.0 } },
  { id: "funcional", label: "Treino funcional", met: { leve: 3.8, moderada: 5.0, vigorosa: 8.0 } },
  { id: "pilates", label: "Pilates", met: { leve: 2.8, moderada: 3.0, vigorosa: 3.8 } },
  { id: "yoga", label: "Yoga", met: { leve: 2.3, moderada: 2.5, vigorosa: 4.0 } },
  { id: "danca", label: "Dança", met: { leve: 3.5, moderada: 5.0, vigorosa: 7.3 } },
  { id: "bicicleta", label: "Bicicleta", met: { leve: 4.0, moderada: 6.8, vigorosa: 8.0 } },
  { id: "natacao", label: "Natação", met: { leve: 4.8, moderada: 6.0, vigorosa: 9.8 } },
  { id: "pular_corda", label: "Pular corda", met: { leve: 8.3, moderada: 11.0, vigorosa: 12.3 } },
  { id: "escadas", label: "Escadas", met: { leve: 4.0, moderada: 6.0, vigorosa: 8.8 } },
  { id: "alongamento", label: "Alongamento", met: { leve: 2.0, moderada: 2.3, vigorosa: 2.8 } },
  { id: "faxina", label: "Faxina", met: { leve: 2.5, moderada: 3.3, vigorosa: 4.0 } },
  {
    id: "carrinho_bebe",
    label: "Caminhada com carrinho de bebê",
    met: { leve: 2.5, moderada: 3.0, vigorosa: 4.0 },
  },
  { id: "treino_casa", label: "Treino em casa", met: { leve: 3.0, moderada: 3.8, vigorosa: 6.0 } },
  {
    id: "personalizada",
    label: "Atividade personalizada",
    met: { leve: 2.5, moderada: 3.5, vigorosa: 5.0 },
  },
];

export const INTENSITY_LABELS: Record<Intensity, string> = {
  leve: "Leve",
  moderada: "Moderada",
  vigorosa: "Vigorosa",
};

export function activityLabel(id: string): string {
  return ACTIVITY_TYPES.find((a) => a.id === id)?.label ?? "Atividade";
}

export function metFor(id: string, intensity: Intensity): number {
  const t = ACTIVITY_TYPES.find((a) => a.id === id) ?? ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1]!;
  return t.met[intensity];
}

/** MET do sono (Compendium 07030: dormir ≈ 0,95). */
export const SLEEP_MET = 0.95;
/** MET de repouso acordado dentro do período de sono (deitado acordado ≈ 1,0). */
export const AWAKE_IN_BED_MET = 1.0;

export type ActivityLevel = "sedentario" | "leve" | "moderado" | "ativo";

/**
 * MET médio do tempo ACORDADO NÃO REGISTRADO, conforme o nível habitual de atividade
 * (inclui pequenas movimentações do dia a dia, mas NÃO os exercícios registrados).
 * Com 8 h de sono, resultam em níveis médios diários ≈ 1,32 / 1,45 / 1,58 / 1,72 × repouso.
 */
export const BASELINE_AWAKE_MET: Record<ActivityLevel, number> = {
  sedentario: 1.5,
  leve: 1.7,
  moderado: 1.9,
  ativo: 2.1,
};

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentario: "Sedentário (quase sempre sentado)",
  leve: "Levemente ativo (anda um pouco no dia a dia)",
  moderado: "Moderadamente ativo (em pé ou andando boa parte do dia)",
  ativo: "Muito ativo (trabalho físico)",
};
