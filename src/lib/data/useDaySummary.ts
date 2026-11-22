"use client";

import { useMemo } from "react";
import { useAppData, useRecords } from "./provider";
import { dayRange } from "@/lib/dates";
import { computeDayEnergy, type DayEnergyResult } from "@/lib/calc/energy";
import { lactationCost } from "@/lib/calc/lactation";
import { estimateBmr, type BmrEstimate } from "@/lib/calc/bmr";
import { BASELINE_AWAKE_MET } from "@/lib/calc/met";
import { sumMacros, type Macros } from "@/lib/calc/macros";
import { ageFromBirthDate } from "@/lib/calc/eligibility";
import { effectiveSleepMinutes } from "@/lib/calc/sleep";
import { useNow } from "@/lib/useNow";

const DAY = 86_400_000;

export interface DaySummary {
  loading: boolean;
  consumedKcal: number;
  macros: Macros;
  mealsCount: number;
  waterMl: number;
  sleepMinutes: number | null;
  activityMinutes: number;
  energy: DayEnergyResult | null;
  bmr: BmrEstimate | null;
  /** Motivo para não haver estimativa de gasto (ex.: falta o peso). */
  energyMissing: string | null;
}

export function useDaySummary(dateKey: string): DaySummary {
  const { tz, profile, screening, latestWeight, eligibility } = useAppData();
  const isLactante = eligibility.mode === "lactante";
  const pattern = profile?.breastfeeding_pattern;
  const lactation = useMemo(
    () => (isLactante ? lactationCost(pattern) : null),
    [isLactante, pattern],
  );
  const now = useNow(60_000);
  const { start, end } = useMemo(() => dayRange(dateKey, tz), [dateKey, tz]);
  const s = new Date(start).toISOString();
  const e = new Date(end).toISOString();

  const foods = useRecords("food_entries", { from: s, to: e });
  const ids = foods.data.map((f) => f.id);
  const items = useRecords("food_items", { in: { field: "food_entry_id", values: ids } });
  const water = useRecords("hydration_entries", { from: s, to: e });
  const sleeps = useRecords("sleep_entries", { from: s, to: new Date(end + DAY).toISOString() });
  const acts = useRecords("activity_entries", { from: new Date(start - DAY).toISOString(), to: e });

  return useMemo(() => {
    const entryIds = new Set(foods.data.map((f) => f.id));
    const dayItems = items.data.filter((i) => entryIds.has(i.food_entry_id));
    const macros = sumMacros(
      dayItems.map((i) => ({ proteinG: i.protein_g, carbsG: i.carbs_g, fatG: i.fat_g })),
    );
    const consumedKcal = foods.data.reduce((sum, f) => sum + (f.total_kcal || 0), 0);
    const waterMl = water.data.reduce((sum, w) => sum + w.volume_ml, 0);

    // Sono que terminou neste dia (noite anterior)
    const nightSleeps = sleeps.data.filter((x) => {
      const endMs = Date.parse(x.ended_at);
      return endMs >= start && endMs < end;
    });
    const sleepMinutes = nightSleeps.length
      ? nightSleeps.reduce(
          (sum, x) =>
            sum +
            effectiveSleepMinutes({
              start: Date.parse(x.started_at),
              end: Date.parse(x.ended_at),
              awakeMinutes: x.awake_minutes,
            }),
          0,
        )
      : null;

    const dayActs = acts.data.filter(
      (a) => Date.parse(a.ended_at) > start && Date.parse(a.started_at) < end,
    );
    const activityMinutes = dayActs.reduce(
      (sum, a) =>
        sum +
        (Math.min(Date.parse(a.ended_at), end) - Math.max(Date.parse(a.started_at), start)) /
          60_000,
      0,
    );

    const age = ageFromBirthDate(screening?.birth_date ?? null);
    const weight = latestWeight?.weight_kg ?? null;
    const height = profile?.height_cm ?? null;
    let energyMissing: string | null = null;
    if (!weight) energyMissing = "Registre seu peso para estimarmos o gasto do dia.";
    else if (age === null)
      energyMissing = "Complete a triagem (data de nascimento) para estimarmos o gasto.";
    else if (age < 18)
      energyMissing =
        "A estimativa de gasto para perda de peso não está disponível para menores de 18 anos.";

    const bmr =
      weight && height && age !== null && age >= 18
        ? estimateBmr({
            weightKg: weight,
            heightCm: height,
            ageYears: age,
            parameter: profile?.equation_parameter ?? "nao_informado",
          })
        : null;

    const energy =
      !energyMissing && weight
        ? computeDayEnergy({
            dayStart: start,
            dayEnd: end,
            now,
            weightKg: weight,
            bmrKcal: bmr?.kcal ?? null,
            bmrLow: bmr?.low ?? null,
            bmrHigh: bmr?.high ?? null,
            baselineMet: BASELINE_AWAKE_MET[profile?.activity_level ?? "leve"],
            lactation,
            sleeps: sleeps.data.map((x) => ({
              id: x.id,
              start: Date.parse(x.started_at),
              end: Date.parse(x.ended_at),
              awakeMinutes: x.awake_minutes,
            })),
            activities: acts.data.map((a) => ({
              id: a.id,
              start: Date.parse(a.started_at),
              end: Date.parse(a.ended_at),
              met: a.met,
            })),
          })
        : null;

    return {
      loading: foods.loading || items.loading || water.loading || sleeps.loading || acts.loading,
      consumedKcal,
      macros,
      mealsCount: foods.data.length,
      waterMl,
      sleepMinutes,
      activityMinutes,
      energy,
      bmr,
      energyMissing,
    };
  }, [
    foods,
    items,
    water,
    sleeps,
    acts,
    start,
    end,
    screening,
    latestWeight,
    profile,
    now,
    lactation,
  ]);
}

/** Fator individual (TMB ÷ peso×24) e dados básicos para estimativas fora do dashboard. */
export function usePersonalBasics() {
  const { profile, screening, latestWeight } = useAppData();
  return useMemo(() => {
    const age = ageFromBirthDate(screening?.birth_date ?? null);
    const weight = latestWeight?.weight_kg ?? null;
    const height = profile?.height_cm ?? null;
    const bmr =
      weight && height && age !== null && age >= 18
        ? estimateBmr({
            weightKg: weight,
            heightCm: height,
            ageYears: age,
            parameter: profile?.equation_parameter ?? "nao_informado",
          })
        : null;
    const factor = bmr && weight ? bmr.kcal / (weight * 24) : 1;
    return {
      age,
      weight,
      height,
      bmr,
      factor,
      baselineMet: BASELINE_AWAKE_MET[profile?.activity_level ?? "leve"],
    };
  }, [profile, screening, latestWeight]);
}
