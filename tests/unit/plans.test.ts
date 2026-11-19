import { effectivePlan, extendPeriod, hasFeature, PLANS } from "@/lib/plans";

const now = Date.parse("2026-11-19T12:00:00Z");
const iso = (d: number) => new Date(now + d * 86_400_000).toISOString();

describe("planos e assinaturas", () => {
  it("sem assinatura = grátis", () => {
    expect(effectivePlan(null, now).plan).toBe("gratis");
  });
  it("teste de 7 dias vale até o fim e depois volta ao grátis", () => {
    expect(
      effectivePlan(
        { plan: "plus", status: "trial", trial_ends_at: iso(3), current_period_end: null },
        now,
      ),
    ).toMatchObject({ plan: "plus", isTrial: true, daysLeft: 3 });
    expect(
      effectivePlan(
        { plan: "plus", status: "trial", trial_ends_at: iso(-1), current_period_end: null },
        now,
      ).plan,
    ).toBe("gratis");
  });
  it("cancelado continua até o fim do período pago", () => {
    const e = effectivePlan(
      { plan: "plus_ia", status: "canceled", trial_ends_at: null, current_period_end: iso(10) },
      now,
    );
    expect(e).toMatchObject({ plan: "plus_ia", canceledAtPeriodEnd: true });
    expect(
      effectivePlan(
        { plan: "plus_ia", status: "canceled", trial_ends_at: null, current_period_end: iso(-1) },
        now,
      ).plan,
    ).toBe("gratis");
  });
  it("expirado = grátis", () => {
    expect(
      effectivePlan(
        { plan: "plus", status: "expired", trial_ends_at: null, current_period_end: iso(30) },
        now,
      ).plan,
    ).toBe("gratis");
  });
  it("recursos por plano; segurança nunca é paga", () => {
    expect(hasFeature("gratis", "saldo_acumulado")).toBe(false);
    expect(hasFeature("plus", "saldo_acumulado")).toBe(true);
    expect(hasFeature("plus", "ia_foto")).toBe(false);
    expect(hasFeature("plus_ia", "ia_foto")).toBe(true);
    expect(PLANS.gratis.highlights.join(" ")).toMatch(/Modo Lactante/);
  });
  it("renovação soma a partir do fim atual", () => {
    expect(extendPeriod(iso(10), "mensal", now).slice(0, 10)).toBe("2026-12-29");
    expect(extendPeriod(null, "anual", now).slice(0, 10)).toBe("2027-11-19");
    expect(extendPeriod(iso(-5), "mensal", now).slice(0, 10)).toBe("2026-12-19");
  });
});
