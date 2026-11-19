/** Cálculos do temporizador de jejum (puramente de tempo; sem promessas fisiológicas). */

export interface FastingTimerState {
  elapsedMs: number;
  remainingMs: number;
  progress: number; // 0..1
  reachedTarget: boolean;
  expectedEnd: number;
}

export function fastingState(
  startedAt: number,
  protocolHours: number,
  now: number,
): FastingTimerState {
  const target = protocolHours * 3_600_000;
  const elapsed = Math.max(0, now - startedAt);
  return {
    elapsedMs: elapsed,
    remainingMs: Math.max(0, target - elapsed),
    progress: target > 0 ? Math.min(1, elapsed / target) : 0,
    reachedTarget: elapsed >= target,
    expectedEnd: startedAt + target,
  };
}

export function formatHms(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Linha do tempo EDUCATIVA e QUALITATIVA. As faixas são aproximadas e variam conforme pessoa,
 * refeição anterior, atividade e saúde. Não afirmamos que cetose, autofagia ou "queima de gordura"
 * começam em hora exata.
 */
export const FASTING_EDUCATION = [
  {
    phase: "Após a refeição",
    text: "Digestão e absorção dos nutrientes. A insulina tende a subir e o corpo usa e armazena parte da energia recebida.",
  },
  {
    phase: "Algumas horas depois",
    text: "A insulina tende a voltar a níveis mais baixos e o corpo passa a recorrer mais às reservas, como o glicogênio do fígado.",
  },
  {
    phase: "Com mais horas",
    text: "Gradualmente, aumenta o uso de gordura como fonte de energia. O ritmo dessas mudanças é individual e não começa em um horário exato.",
  },
  {
    phase: "Jejuns prolongados",
    text: "Exigem acompanhamento profissional. Mais horas não significam automaticamente mais benefício.",
  },
] as const;

export const FASTING_WARNING_SIGNS = [
  "Tontura ou sensação de desmaio",
  "Tremores, suor frio ou palpitações",
  "Confusão mental ou dificuldade de concentração intensa",
  "Fraqueza importante",
  "Sinais de desidratação (boca muito seca, urina escura, pouca urina)",
] as const;

export const BREAK_FAST_IDEAS = [
  "Água e, em seguida, uma refeição em porção confortável",
  "Ovos + fruta + aveia",
  "Arroz + feijão + frango + salada",
  "Sopa de legumes com uma fonte de proteína",
  "Iogurte natural + fruta, quando tolerado",
] as const;
