import { addDays, dayRange, localDateKey } from "@/lib/dates";
import { computeDayEnergy } from "@/lib/calc/energy";
import { effectiveSleepMinutes } from "@/lib/calc/sleep";
import type {
  ActivityEntry,
  FoodEntry,
  FoodItem,
  HydrationEntry,
  SleepEntry,
  WeightEntry,
} from "@/lib/data/types";

export interface DailyRow {
  date: string;
  consumed: number; // informado/estimado
  expenditure: number | null; // estimado
  balance: number | null;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number; // informado
  sleepMin: number | null; // informado
  activityMin: number;
  weightKg: number | null; // medido
}

export function buildDailyReport(p: {
  endDate: string;
  days: number;
  tz: string;
  foods: FoodEntry[];
  items: FoodItem[];
  water: HydrationEntry[];
  sleeps: SleepEntry[];
  acts: ActivityEntry[];
  weights: WeightEntry[];
  bmrForWeight: (kg: number) => { kcal: number; low: number; high: number } | null;
  baselineMet: number;
  now?: number;
}): DailyRow[] {
  const rows: DailyRow[] = [];
  const now = p.now ?? Date.now();
  const sortedW = [...p.weights].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  const itemsByEntry = new Map<string, FoodItem[]>();
  for (const i of p.items)
    itemsByEntry.set(i.food_entry_id, [...(itemsByEntry.get(i.food_entry_id) ?? []), i]);

  for (let i = p.days - 1; i >= 0; i--) {
    const date = addDays(p.endDate, -i);
    const { start, end } = dayRange(date, p.tz);
    const dayFoods = p.foods.filter((f) => localDateKey(Date.parse(f.eaten_at), p.tz) === date);
    const its = dayFoods.flatMap((f) => itemsByEntry.get(f.id) ?? []);
    const consumed = dayFoods.reduce((s, f) => s + f.total_kcal, 0);
    // Peso vigente no dia; antes da primeira pesagem, usa a pesagem mais antiga disponível.
    const weightThatDay =
      sortedW.filter((w) => Date.parse(w.measured_at) < end).at(-1)?.weight_kg ??
      sortedW[0]?.weight_kg ??
      null;
    const measuredToday =
      sortedW.filter((w) => localDateKey(Date.parse(w.measured_at), p.tz) === date).at(-1)
        ?.weight_kg ?? null;
    const nightSleeps = p.sleeps.filter((s) => {
      const e = Date.parse(s.ended_at);
      return e >= start && e < end;
    });
    let expenditure: number | null = null;
    if (weightThatDay) {
      const bmr = p.bmrForWeight(weightThatDay);
      expenditure = computeDayEnergy({
        dayStart: start,
        dayEnd: end,
        now,
        weightKg: weightThatDay,
        bmrKcal: bmr?.kcal ?? null,
        bmrLow: bmr?.low ?? null,
        bmrHigh: bmr?.high ?? null,
        baselineMet: p.baselineMet,
        sleeps: p.sleeps.map((s) => ({
          id: s.id,
          start: Date.parse(s.started_at),
          end: Date.parse(s.ended_at),
          awakeMinutes: s.awake_minutes,
        })),
        activities: p.acts.map((a) => ({
          id: a.id,
          start: Date.parse(a.started_at),
          end: Date.parse(a.ended_at),
          met: a.met,
        })),
      }).elapsed.kcal;
      if (start > now) expenditure = null;
    }
    rows.push({
      date,
      consumed,
      expenditure,
      balance: expenditure !== null && dayFoods.length > 0 ? consumed - expenditure : null,
      protein: its.reduce((s, x) => s + x.protein_g, 0),
      carbs: its.reduce((s, x) => s + x.carbs_g, 0),
      fat: its.reduce((s, x) => s + x.fat_g, 0),
      waterMl: p.water
        .filter((w) => localDateKey(Date.parse(w.drank_at), p.tz) === date)
        .reduce((s, w) => s + w.volume_ml, 0),
      sleepMin: nightSleeps.length
        ? nightSleeps.reduce(
            (s, x) =>
              s +
              effectiveSleepMinutes({
                start: Date.parse(x.started_at),
                end: Date.parse(x.ended_at),
                awakeMinutes: x.awake_minutes,
              }),
            0,
          )
        : null,
      activityMin: p.acts
        .filter((a) => Date.parse(a.ended_at) > start && Date.parse(a.started_at) < end)
        .reduce(
          (s, a) =>
            s +
            (Math.min(Date.parse(a.ended_at), end) - Math.max(Date.parse(a.started_at), start)) /
              60_000,
          0,
        ),
      weightKg: measuredToday,
    });
  }
  return rows;
}

export function toCsv(rows: DailyRow[]): string {
  const head = [
    "data",
    "consumo_kcal_informado",
    "gasto_kcal_estimado",
    "saldo_kcal_estimado",
    "proteinas_g",
    "carboidratos_g",
    "gorduras_g",
    "agua_ml_informada",
    "sono_min_informado",
    "atividade_min_informada",
    "peso_kg_medido",
  ];
  const f = (n: number | null) => (n === null ? "" : String(Math.round(n * 10) / 10));
  const lines = rows.map((r) =>
    [
      r.date,
      f(r.consumed),
      f(r.expenditure),
      f(r.balance),
      f(r.protein),
      f(r.carbs),
      f(r.fat),
      f(r.waterMl),
      f(r.sleepMin),
      f(r.activityMin),
      f(r.weightKg),
    ].join(";"),
  );
  return [head.join(";"), ...lines].join("\n");
}
