/**
 * TRIAGEM E ELEGIBILIDADE — regras de segurança do Leveza.
 *
 * Princípio central: AUSÊNCIA DE RESPOSTA NÃO É AUTORIZAÇÃO. Qualquer item não respondido,
 * "não sei" ou "prefiro não dizer" em perguntas de risco mantém jejum e déficit bloqueados.
 * As mensagens explicam e encaminham a profissional — nunca diagnosticam.
 */

export type FastingProtocol = 12 | 14 | 16 | 18 | 20 | 24;
export const FASTING_PROTOCOLS: FastingProtocol[] = [12, 14, 16, 18, 20, 24];

export type ClinicalCondition =
  | "doenca_renal"
  | "doenca_hepatica"
  | "doenca_cardiovascular"
  | "desmaios_pressao_baixa"
  | "tratamento_oncologico"
  | "cirurgia_bariatrica"
  | "outra_em_acompanhamento";

export const CLINICAL_CONDITION_LABELS: Record<ClinicalCondition, string> = {
  doenca_renal: "Doença renal",
  doenca_hepatica: "Doença hepática",
  doenca_cardiovascular: "Doença cardiovascular",
  desmaios_pressao_baixa: "Desmaios ou pressão baixa frequentes",
  tratamento_oncologico: "Tratamento oncológico",
  cirurgia_bariatrica: "Cirurgia bariátrica",
  outra_em_acompanhamento: "Outra condição em acompanhamento médico",
};

export interface HealthScreening {
  birth_date: string | null; // YYYY-MM-DD
  pregnant: "sim" | "nao" | "nao_se_aplica" | null;
  breastfeeding: "sim" | "nao" | "nao_se_aplica" | null;
  eating_disorder: "atual" | "previo" | "nao" | "prefiro_nao_dizer" | null;
  diabetes: "tipo1" | "tipo2" | "outro" | "nao" | "nao_sei" | null;
  hypoglycemia_meds: "sim" | "nao" | "nao_sei" | null;
  /** [] não respondido; ["nenhuma"] resposta explícita de nenhuma. */
  clinical_conditions: (ClinicalCondition | "nenhuma")[];
  physical_limitations: string | null;
  dietary_restrictions: string | null;
  consent_health_data: boolean;
}

export type Mode = "padrao" | "lactante" | "gestante" | "menor";

export interface Gate {
  allowed: boolean;
  reasons: string[];
}

export type ProtocolStatus = "disponivel" | "requer_confirmacao_profissional" | "bloqueado";

export interface ProtocolGate {
  status: ProtocolStatus;
  reasons: string[];
}

export interface Eligibility {
  complete: boolean;
  missing: string[];
  ageYears: number | null;
  mode: Mode;
  /** Metas de emagrecimento e contagem calórica voltada à perda de peso. */
  weightLoss: Gate;
  /** Sugestão automática de déficit calórico. */
  calorieDeficit: Gate;
  /** Jejum programado (qualquer protocolo). */
  fasting: Gate;
  fastingProtocols: Record<FastingProtocol, ProtocolGate>;
}

export function ageFromBirthDate(
  birthDate: string | null,
  today: Date = new Date(),
): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [y, m, d] = birthDate.split("-").map(Number) as [number, number, number];
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export const MSG = {
  menor:
    "Para menores de 18 anos, metas de emagrecimento, contagem calórica para perda de peso e jejum não estão disponíveis. Procure orientação de um profissional de saúde que acompanhe sua idade.",
  gestante:
    "Durante a gestação, metas de emagrecimento, déficit calórico e jejum não estão disponíveis. Seu acompanhamento pré-natal é a melhor referência para alimentação e ganho de peso.",
  lactante:
    "Durante a amamentação, o Leveza não oferece jejum programado nem déficit automático. Você pode registrar refeições, água, sono e bem-estar. Converse com seu profissional de saúde para orientação individual.",
  transtorno:
    "Por segurança, jejum e metas restritivas ficam indisponíveis quando há histórico de transtorno alimentar (ou quando a pergunta não foi respondida). Um acompanhamento especializado pode ajudar a definir metas seguras para você.",
  hipoglicemia:
    "Diabetes ou medicamentos que podem causar hipoglicemia exigem avaliação individual antes de qualquer jejum. Converse com quem acompanha seu tratamento.",
  condicao:
    "A condição clínica informada pede avaliação individual antes de jejum ou restrição energética. Converse com seu profissional de saúde.",
  incompleta:
    "Complete a triagem de saúde para que possamos mostrar o que é adequado para você. Perguntas sem resposta não são consideradas autorização.",
  baixoPeso:
    "Seu IMC atual está abaixo de 18,5. Metas de perda de peso não são oferecidas; um profissional pode avaliar o que faz sentido para você.",
  prolongado18e20:
    "Jejuns de 18 ou 20 horas não são recomendação automática. Só ative se tiver acompanhamento profissional que conheça seu caso.",
  prolongado24:
    "Jejum de 24 horas só pode ser ativado com confirmação de que um profissional de saúde orientou esse protocolo para você.",
} as const;

function missingFields(s: HealthScreening | null): string[] {
  if (!s) return ["triagem"];
  const m: string[] = [];
  if (!s.birth_date) m.push("data de nascimento");
  if (s.pregnant === null) m.push("gestação");
  if (s.breastfeeding === null) m.push("amamentação");
  if (s.eating_disorder === null) m.push("histórico de transtorno alimentar");
  if (s.diabetes === null) m.push("diabetes");
  if (s.hypoglycemia_meds === null) m.push("medicamentos com risco de hipoglicemia");
  if (s.clinical_conditions.length === 0) m.push("condições clínicas");
  if (!s.consent_health_data) m.push("consentimento para dados de saúde");
  return m;
}

export interface EligibilityOptions {
  today?: Date;
  /** IMC atual, se conhecido (para bloquear perda de peso com IMC < 18,5). */
  currentBmi?: number | null;
}

export function evaluateEligibility(
  s: HealthScreening | null,
  opts: EligibilityOptions = {},
): Eligibility {
  const missing = missingFields(s);
  const complete = missing.length === 0;
  const age = ageFromBirthDate(s?.birth_date ?? null, opts.today);

  const fastingReasons: string[] = [];
  const deficitReasons: string[] = [];
  const lossReasons: string[] = [];
  let mode: Mode = "padrao";

  if (!complete || age === null) {
    fastingReasons.push(MSG.incompleta);
    deficitReasons.push(MSG.incompleta);
    lossReasons.push(MSG.incompleta);
  }

  if (age !== null && age < 18) {
    mode = "menor";
    fastingReasons.push(MSG.menor);
    deficitReasons.push(MSG.menor);
    lossReasons.push(MSG.menor);
  }

  if (s?.pregnant === "sim") {
    if (mode === "padrao") mode = "gestante";
    fastingReasons.push(MSG.gestante);
    deficitReasons.push(MSG.gestante);
    lossReasons.push(MSG.gestante);
  }

  if (s?.breastfeeding === "sim") {
    if (mode === "padrao") mode = "lactante";
    fastingReasons.push(MSG.lactante);
    deficitReasons.push(MSG.lactante);
    lossReasons.push(MSG.lactante);
  }

  if (s && s.eating_disorder !== "nao") {
    // "atual", "previo", "prefiro_nao_dizer" ou sem resposta
    fastingReasons.push(MSG.transtorno);
    deficitReasons.push(MSG.transtorno);
    lossReasons.push(MSG.transtorno);
  }

  if (s && (s.diabetes !== "nao" || s.hypoglycemia_meds !== "nao")) {
    fastingReasons.push(MSG.hipoglicemia);
    deficitReasons.push(MSG.hipoglicemia);
  }

  if (s && s.clinical_conditions.some((c) => c !== "nenhuma")) {
    fastingReasons.push(MSG.condicao);
    deficitReasons.push(MSG.condicao);
  }

  if (typeof opts.currentBmi === "number" && opts.currentBmi < 18.5) {
    lossReasons.push(MSG.baixoPeso);
    deficitReasons.push(MSG.baixoPeso);
    fastingReasons.push(MSG.baixoPeso);
  }

  const uniq = (a: string[]) => [...new Set(a)];
  const fasting: Gate = { allowed: fastingReasons.length === 0, reasons: uniq(fastingReasons) };

  const fastingProtocols = {} as Record<FastingProtocol, ProtocolGate>;
  for (const p of FASTING_PROTOCOLS) {
    if (!fasting.allowed) fastingProtocols[p] = { status: "bloqueado", reasons: fasting.reasons };
    else if (p === 24)
      fastingProtocols[p] = {
        status: "requer_confirmacao_profissional",
        reasons: [MSG.prolongado24],
      };
    else if (p >= 18)
      fastingProtocols[p] = {
        status: "requer_confirmacao_profissional",
        reasons: [MSG.prolongado18e20],
      };
    else fastingProtocols[p] = { status: "disponivel", reasons: [] };
  }

  return {
    complete,
    missing,
    ageYears: age,
    mode,
    weightLoss: { allowed: lossReasons.length === 0, reasons: uniq(lossReasons) },
    calorieDeficit: { allowed: deficitReasons.length === 0, reasons: uniq(deficitReasons) },
    fasting,
    fastingProtocols,
  };
}

export interface FastingStartRequest {
  protocol: FastingProtocol;
  confirmedProfessionalFollowUp: boolean;
  /** Para 24 h: profissional orientou especificamente este protocolo. */
  confirmedProfessional24h: boolean;
}

/** Validação final no momento de iniciar (usada no cliente E no servidor/BD). */
export function canStartFasting(e: Eligibility, req: FastingStartRequest): Gate {
  const gate = e.fastingProtocols[req.protocol];
  if (!gate) return { allowed: false, reasons: ["Protocolo inválido."] };
  if (gate.status === "bloqueado") return { allowed: false, reasons: gate.reasons };
  if (gate.status === "requer_confirmacao_profissional") {
    if (!req.confirmedProfessionalFollowUp) return { allowed: false, reasons: gate.reasons };
    if (req.protocol === 24 && !req.confirmedProfessional24h)
      return { allowed: false, reasons: [MSG.prolongado24] };
  }
  return { allowed: true, reasons: [] };
}
