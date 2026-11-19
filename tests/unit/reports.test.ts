import { buildDailyReport, toCsv } from "@/lib/reports";
import type { FoodEntry, FoodItem, WeightEntry } from "@/lib/data/types";

const base = { user_id: "u", created_at: "", updated_at: "" };
const tz = "America/Sao_Paulo";

describe("relatório diário", () => {
  const foods: FoodEntry[] = [
    {
      ...base,
      id: "f1",
      eaten_at: "2026-11-18T15:00:00Z",
      meal: "almoco",
      photo_path: null,
      source: "manual",
      total_kcal: 600,
      notes: null,
    },
  ];
  const items: FoodItem[] = [
    {
      ...base,
      id: "i1",
      food_entry_id: "f1",
      name: "x",
      category: null,
      quantity: 100,
      unit: "g",
      grams: 100,
      kcal: 600,
      protein_g: 30,
      carbs_g: 60,
      fat_g: 20,
      fiber_g: null,
      nutrition_source: "t",
      source_consulted_at: null,
      confidence: "informado",
      edited: false,
    },
  ];
  const weights: WeightEntry[] = [
    {
      ...base,
      id: "w1",
      measured_at: "2026-11-17T10:00:00Z",
      weight_kg: 70,
      notes: null,
      conditions: null,
    },
  ];

  it("agrega por dia local, usa o peso vigente e só calcula saldo em dias com refeição", () => {
    const rows = buildDailyReport({
      endDate: "2026-11-18",
      days: 2,
      tz,
      foods,
      items,
      water: [],
      sleeps: [],
      acts: [],
      weights,
      bmrForWeight: () => null,
      baselineMet: 1.5,
      now: Date.parse("2026-11-20T00:00:00Z"),
    });
    expect(rows.map((r) => r.date)).toEqual(["2026-11-17", "2026-11-18"]);
    expect(rows[0]!.weightKg).toBe(70);
    expect(rows[0]!.balance).toBeNull();
    expect(rows[1]!.consumed).toBe(600);
    expect(rows[1]!.expenditure).toBeCloseTo(1.5 * 70 * 24, 3);
    expect(rows[1]!.balance).toBeCloseTo(600 - 2520, 3);
    expect(rows[1]!.protein).toBe(30);
  });

  it("gera CSV com origem dos valores no cabeçalho", () => {
    const csv = toCsv(
      buildDailyReport({
        endDate: "2026-11-18",
        days: 1,
        tz,
        foods,
        items,
        water: [],
        sleeps: [],
        acts: [],
        weights,
        bmrForWeight: () => null,
        baselineMet: 1.5,
        now: Date.parse("2026-11-20T00:00:00Z"),
      }),
    );
    expect(csv.split("\n")[0]).toContain("gasto_kcal_estimado");
    expect(csv.split("\n")[0]).toContain("peso_kg_medido");
    expect(csv.split("\n")).toHaveLength(2);
  });
});
