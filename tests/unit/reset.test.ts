// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { LocalStore } from "@/lib/data/store";
import { resetAllDays, resetDay } from "@/lib/data/reset";

const TZ = "America/Sao_Paulo";

async function seed(s: LocalStore) {
  for (const iso of ["2026-11-19T15:00:00Z", "2026-11-20T15:00:00Z"]) {
    const e = await s.insert("food_entries", {
      eaten_at: iso,
      meal: "almoco",
      photo_path: null,
      source: "manual",
      total_kcal: 500,
      notes: null,
    });
    await s.insert("food_items", {
      food_entry_id: e.id,
      name: "Arroz",
      grams: 100,
      unit: "g",
      kcal: 128,
      protein_g: 2.5,
      carbs_g: 28,
      fat_g: 0.2,
    } as never);
    await s.insert("hydration_entries", { drank_at: iso, volume_ml: 300 } as never);
    await s.insert("weight_entries", { measured_at: iso, weight_kg: 70 } as never);
  }
  await s.insert("habit_checkins", { date: "2026-11-20", habit: "agua", status: "feito" } as never);
}

describe("resetar registros", () => {
  let s: LocalStore;
  beforeEach(async () => {
    localStorage.clear();
    s = new LocalStore();
    await seed(s);
  });

  it("resetar o dia apaga só aquele dia e mantém o peso por padrão", async () => {
    const n = await resetDay(s, "2026-11-20", TZ, { includeWeight: false });
    expect(n).toBe(3);
    expect(await s.list("food_entries")).toHaveLength(1);
    expect(await s.list("food_items")).toHaveLength(1);
    expect(await s.list("hydration_entries")).toHaveLength(1);
    expect(await s.list("habit_checkins")).toHaveLength(0);
    expect(await s.list("weight_entries")).toHaveLength(2);
  });

  it("resetar o dia pode incluir o peso", async () => {
    await resetDay(s, "2026-11-20", TZ, { includeWeight: true });
    expect(await s.list("weight_entries")).toHaveLength(1);
  });

  it("resetar todos os dias apaga registros e mantém peso e perfil", async () => {
    await resetAllDays(s, { includeWeight: false });
    expect(await s.list("food_entries")).toHaveLength(0);
    expect(await s.list("food_items")).toHaveLength(0);
    expect(await s.list("hydration_entries")).toHaveLength(0);
    expect(await s.list("weight_entries")).toHaveLength(2);
  });
});
