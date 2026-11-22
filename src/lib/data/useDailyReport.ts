"use client";

import { useMemo } from "react";
import { useAppData, useRecords } from "./provider";
import { usePersonalBasics } from "./useDaySummary";
import { addDays, dayRange } from "@/lib/dates";
import { buildDailyReport } from "@/lib/reports";
import { estimateBmr } from "@/lib/calc/bmr";
import { lactationCost } from "@/lib/calc/lactation";
import { todayKey } from "@/lib/utils";

/** Linhas diárias (consumo, gasto estimado, saldo, peso…) dos últimos `days` dias. */
export function useDailyReport(days: number) {
  const { tz, profile, eligibility } = useAppData();
  const isLactante = eligibility.mode === "lactante";
  const pattern = profile?.breastfeeding_pattern;
  const lactation = useMemo(
    () => (isLactante ? lactationCost(pattern) : null),
    [isLactante, pattern],
  );
  const basics = usePersonalBasics();
  const today = todayKey(tz);
  const from = new Date(dayRange(addDays(today, -days + 1), tz).start).toISOString();
  const fromWide = new Date(dayRange(addDays(today, -days), tz).start).toISOString();
  const to = new Date(dayRange(today, tz).end).toISOString();

  const foods = useRecords("food_entries", { from, to, limit: 5000 });
  const items = useRecords("food_items", {
    in: { field: "food_entry_id", values: foods.data.map((f) => f.id) },
    limit: 20000,
  });
  const water = useRecords("hydration_entries", { from, to, limit: 5000 });
  const sleeps = useRecords("sleep_entries", {
    from,
    to: new Date(Date.parse(to) + 86_400_000).toISOString(),
    limit: 2000,
  });
  const acts = useRecords("activity_entries", { from: fromWide, to, limit: 5000 });
  const weights = useRecords("weight_entries", { order: "asc", limit: 5000 });

  const rows = useMemo(
    () =>
      buildDailyReport({
        endDate: today,
        days,
        tz,
        foods: foods.data,
        items: items.data,
        water: water.data,
        sleeps: sleeps.data,
        acts: acts.data,
        weights: weights.data,
        baselineMet: basics.baselineMet,
        lactation,
        bmrForWeight: (kg) =>
          basics.height && basics.age !== null && basics.age >= 18
            ? estimateBmr({
                weightKg: kg,
                heightCm: basics.height,
                ageYears: basics.age,
                parameter: profile?.equation_parameter ?? "nao_informado",
              })
            : null,
      }),
    [
      today,
      days,
      tz,
      foods.data,
      items.data,
      water.data,
      sleeps.data,
      acts.data,
      weights.data,
      basics,
      profile,
      lactation,
    ],
  );

  return {
    rows,
    today,
    from,
    to,
    acts,
    weights,
    loading: foods.loading || items.loading || acts.loading,
  };
}
