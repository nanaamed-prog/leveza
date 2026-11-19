import { render, screen } from "@testing-library/react";
import { MacroRing } from "@/components/leveza/MacroRing";
import { EligibilityNotice } from "@/components/leveza/EligibilityNotice";
import { ProgressRing } from "@/components/leveza/ProgressRing";
import { StatCard } from "@/components/leveza/StatCard";
import { Droplets } from "lucide-react";

describe("componentes acessíveis", () => {
  it("MacroRing descreve a distribuição para leitores de tela", () => {
    render(<MacroRing macros={{ proteinG: 25, carbsG: 50, fatG: 10 }} />);
    expect(
      screen.getByRole("img", { name: /Proteínas 26%, Carboidratos 51%, Gorduras 23%/ }),
    ).toBeInTheDocument();
  });

  it("MacroRing sem dados não inventa percentuais", () => {
    render(<MacroRing macros={{ proteinG: 0, carbsG: 0, fatG: 0 }} />);
    expect(screen.getByRole("img", { name: /Sem dados/ })).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("ProgressRing sem meta informa 'sem meta definida'", () => {
    render(<ProgressRing value={null} label="Consumo" />);
    expect(screen.getByRole("img", { name: "Consumo: sem meta definida" })).toBeInTheDocument();
  });

  it("EligibilityNotice lista motivos e link para revisar triagem", () => {
    render(<EligibilityNotice reasons={["Motivo A", "Motivo B"]} />);
    expect(screen.getByRole("note")).toHaveTextContent("Motivo A");
    expect(screen.getByRole("link", { name: "Revisar minha triagem" })).toHaveAttribute(
      "href",
      "/app/perfil/triagem",
    );
  });

  it("StatCard mostra estado vazio honesto", () => {
    render(<StatCard icon={Droplets} label="Água" value={null} />);
    expect(screen.getByText("Sem registro")).toBeInTheDocument();
  });
});
