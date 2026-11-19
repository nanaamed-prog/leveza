import { render, screen } from "@testing-library/react";
import { PlusGate } from "@/components/leveza/PlusGate";
import { hasFeature, type Feature, type PlanId } from "@/lib/plans";

let current: PlanId = "gratis";
let trialUsed = false;
vi.mock("@/lib/data/usePlan", () => ({
  usePlan: () => ({ loading: false, plan: current, trialUsed, can: (f: Feature) => hasFeature(current, f) }),
}));

describe("PlusGate", () => {
  it("grátis vê convite com teste de 7 dias", () => {
    current = "gratis";
    render(
      <PlusGate feature="saldo_acumulado" title="Saldo" text="Só no Plus">
        <p>conteúdo pago</p>
      </PlusGate>,
    );
    expect(screen.queryByText("conteúdo pago")).toBeNull();
    expect(screen.getByRole("link", { name: /Testar 7 dias grátis/ })).toHaveAttribute("href", "/app/planos");
  });
  it("Plus vê o conteúdo; IA continua bloqueada no Plus", () => {
    current = "plus";
    trialUsed = true;
    const { unmount } = render(
      <PlusGate feature="saldo_acumulado" title="Saldo" text="">
        <p>conteúdo pago</p>
      </PlusGate>,
    );
    expect(screen.getByText("conteúdo pago")).toBeInTheDocument();
    unmount();
    render(
      <PlusGate feature="ia_foto" title="Foto" text="">
        <p>foto ia</p>
      </PlusGate>,
    );
    expect(screen.queryByText("foto ia")).toBeNull();
    expect(screen.getByRole("link", { name: /Conhecer o Plus IA/ })).toBeInTheDocument();
  });
});
