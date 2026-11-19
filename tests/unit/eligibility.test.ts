import {
  evaluateEligibility,
  canStartFasting,
  ageFromBirthDate,
  type HealthScreening,
} from "@/lib/calc/eligibility";

const today = new Date("2026-11-19T12:00:00Z");
const ok: HealthScreening = {
  birth_date: "1990-05-10",
  pregnant: "nao",
  breastfeeding: "nao",
  eating_disorder: "nao",
  diabetes: "nao",
  hypoglycemia_meds: "nao",
  clinical_conditions: ["nenhuma"],
  physical_limitations: null,
  dietary_restrictions: null,
  consent_health_data: true,
};
const ev = (s: Partial<HealthScreening> | null) =>
  evaluateEligibility(s === null ? null : { ...ok, ...s }, { today });

describe("triagem e elegibilidade", () => {
  it("adulto sem contraindicações: 12/14/16 disponíveis, 18/20/24 exigem confirmação", () => {
    const e = ev({});
    expect(e.fasting.allowed).toBe(true);
    expect(e.fastingProtocols[12].status).toBe("disponivel");
    expect(e.fastingProtocols[16].status).toBe("disponivel");
    expect(e.fastingProtocols[18].status).toBe("requer_confirmacao_profissional");
    expect(e.fastingProtocols[20].status).toBe("requer_confirmacao_profissional");
    expect(e.fastingProtocols[24].status).toBe("requer_confirmacao_profissional");
  });

  it("ausência de triagem não é autorização", () => {
    const e = ev(null);
    expect(e.fasting.allowed).toBe(false);
    expect(e.calorieDeficit.allowed).toBe(false);
    expect(e.weightLoss.allowed).toBe(false);
  });

  it("pergunta sem resposta bloqueia", () => {
    expect(ev({ eating_disorder: null }).fasting.allowed).toBe(false);
    expect(ev({ hypoglycemia_meds: null }).fasting.allowed).toBe(false);
    expect(ev({ clinical_conditions: [] }).fasting.allowed).toBe(false);
    expect(ev({ consent_health_data: false }).fasting.allowed).toBe(false);
  });

  it("menor de 18: bloqueia jejum, déficit e perda de peso (inclusive na véspera do aniversário)", () => {
    const e = ev({ birth_date: "2008-11-20" });
    expect(e.ageYears).toBe(17);
    expect(e.mode).toBe("menor");
    expect(e.fasting.allowed).toBe(false);
    expect(e.weightLoss.allowed).toBe(false);
    expect(ev({ birth_date: "2008-11-19" }).ageYears).toBe(18);
  });

  it("gestante: bloqueia emagrecimento, déficit e jejum", () => {
    const e = ev({ pregnant: "sim" });
    expect(e.mode).toBe("gestante");
    expect(e.weightLoss.allowed || e.calorieDeficit.allowed || e.fasting.allowed).toBe(false);
  });

  it("lactante: modo dedicado, sem jejum nem déficit", () => {
    const e = ev({ breastfeeding: "sim" });
    expect(e.mode).toBe("lactante");
    expect(e.fasting.allowed).toBe(false);
    expect(e.calorieDeficit.allowed).toBe(false);
    expect(e.fastingProtocols[12].status).toBe("bloqueado");
  });

  it.each(["atual", "previo", "prefiro_nao_dizer"] as const)(
    "transtorno alimentar (%s) bloqueia",
    (v) => {
      const e = ev({ eating_disorder: v });
      expect(e.fasting.allowed).toBe(false);
      expect(e.calorieDeficit.allowed).toBe(false);
    },
  );

  it("diabetes ou risco de hipoglicemia bloqueia jejum", () => {
    expect(ev({ diabetes: "tipo2" }).fasting.allowed).toBe(false);
    expect(ev({ diabetes: "nao_sei" }).fasting.allowed).toBe(false);
    expect(ev({ hypoglycemia_meds: "sim" }).fasting.allowed).toBe(false);
  });

  it("condição clínica bloqueia jejum e déficit", () => {
    const e = ev({ clinical_conditions: ["doenca_renal"] });
    expect(e.fasting.allowed).toBe(false);
    expect(e.calorieDeficit.allowed).toBe(false);
  });

  it("IMC < 18,5 bloqueia perda de peso", () => {
    const e = evaluateEligibility(ok, { today, currentBmi: 18.2 });
    expect(e.weightLoss.allowed).toBe(false);
  });

  it("iniciar 18 h/20 h exige confirmação; 24 h exige confirmação específica", () => {
    const e = ev({});
    expect(
      canStartFasting(e, {
        protocol: 16,
        confirmedProfessionalFollowUp: false,
        confirmedProfessional24h: false,
      }).allowed,
    ).toBe(true);
    expect(
      canStartFasting(e, {
        protocol: 18,
        confirmedProfessionalFollowUp: false,
        confirmedProfessional24h: false,
      }).allowed,
    ).toBe(false);
    expect(
      canStartFasting(e, {
        protocol: 18,
        confirmedProfessionalFollowUp: true,
        confirmedProfessional24h: false,
      }).allowed,
    ).toBe(true);
    expect(
      canStartFasting(e, {
        protocol: 24,
        confirmedProfessionalFollowUp: true,
        confirmedProfessional24h: false,
      }).allowed,
    ).toBe(false);
    expect(
      canStartFasting(e, {
        protocol: 24,
        confirmedProfessionalFollowUp: true,
        confirmedProfessional24h: true,
      }).allowed,
    ).toBe(true);
  });

  it("confirmação profissional não desbloqueia quem está bloqueado", () => {
    const e = ev({ breastfeeding: "sim" });
    expect(
      canStartFasting(e, {
        protocol: 12,
        confirmedProfessionalFollowUp: true,
        confirmedProfessional24h: true,
      }).allowed,
    ).toBe(false);
  });

  it("idade inválida", () => {
    expect(ageFromBirthDate("abc", today)).toBeNull();
    expect(ageFromBirthDate(null, today)).toBeNull();
  });
});
