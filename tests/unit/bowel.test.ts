import { bristolGroup, describeSince, gapNote, hoursSinceLast } from "@/lib/calc/bowel";

describe("meu intestino", () => {
  it("agrupa a escala de Bristol", () => {
    expect(bristolGroup(1)).toBe("seco");
    expect(bristolGroup(4)).toBe("referencia");
    expect(bristolGroup(7)).toBe("solto");
    expect(bristolGroup(null)).toBeNull();
  });
  it("calcula tempo desde o último registro e só avisa a partir de 3 dias", () => {
    const h = hoursSinceLast([0, 10 * 3_600_000], 60 * 3_600_000);
    expect(h).toBe(50);
    expect(describeSince(h)).toBe("Há 2 dias");
    expect(gapNote(h)).toBeNull();
    expect(gapNote(80)).not.toBeNull();
    expect(describeSince(null)).toBe("Sem registros");
  });
});
