import type { HealthScreening, Mode } from "@/lib/calc/eligibility";
import type { EquationParameter } from "@/lib/calc/bmr";
import type { ActivityLevel, Intensity } from "@/lib/calc/met";
import type { GoalType } from "@/lib/calc/weight";

/** Campos comuns a registros privados. Timestamps em ISO 8601 UTC. */
export interface Row {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type PhotoRetention = "nao_guardar" | "30_dias" | "manter";

export interface Profile extends Row {
  display_name: string;
  height_cm: number | null;
  timezone: string;
  week_starts_on: 0 | 1;
  equation_parameter: EquationParameter;
  activity_level: ActivityLevel;
  sleep_routine: string | null;
  mode: Mode;
  onboarding_completed_at: string | null;
}

export interface UserPreferences extends Row {
  water_goal_ml: number;
  cup_sizes_ml: number[];
  photo_retention: PhotoRetention;
  remind_water: boolean;
  remind_fasting: boolean;
  plan52_goals: string[]; // chaves de metas opcionais do Plano 5+2
}

export interface ScreeningRow extends Row, HealthScreening {
  consent_version: string;
}

export interface Goal extends Row {
  type: GoalType;
  target_weight_kg: number | null;
  kcal_target: number | null;
  weekly_rate_kg: number | null;
  status: "ativa" | "encerrada";
}

export interface WeightEntry extends Row {
  measured_at: string;
  weight_kg: number;
  notes: string | null;
  conditions: string | null; // ex.: "em jejum, após acordar"
}

export type Meal = "cafe" | "almoco" | "lanche" | "jantar" | "ceia";
export const MEAL_LABELS: Record<Meal, string> = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  ceia: "Ceia",
};

export interface FoodEntry extends Row {
  eaten_at: string;
  meal: Meal;
  photo_path: string | null;
  source: "manual" | "foto_ia" | "receita";
  total_kcal: number;
  notes: string | null;
}

export type Confidence = "alta" | "media" | "baixa" | "informado";

export interface FoodItem extends Row {
  food_entry_id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: "g" | "ml" | "unidade";
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  nutrition_source: string;
  source_consulted_at: string | null;
  confidence: Confidence;
  edited: boolean;
}

export interface ActivityEntry extends Row {
  activity_type: string;
  custom_name: string | null;
  started_at: string;
  ended_at: string;
  intensity: Intensity;
  perceived_effort: number | null; // 1–10
  met: number;
  kcal_estimated: number;
  notes: string | null;
}

export interface SleepEntry extends Row {
  started_at: string;
  ended_at: string;
  awake_minutes: number;
  awakenings: number | null;
  quality: number | null; // 1–5
  hunger_level: number | null; // 1–5 (exploratório)
  energy_level: number | null; // 1–5 (exploratório)
  notes: string | null;
}

export interface HydrationEntry extends Row {
  drank_at: string;
  volume_ml: number;
}

export interface FastingSession extends Row {
  protocol_hours: number;
  started_at: string;
  expected_end_at: string;
  ended_at: string | null;
  professional_confirmed: boolean;
  professional_24h_confirmed: boolean;
}

export interface HabitCheckin extends Row {
  date: string; // YYYY-MM-DD local
  habit_key: string;
  status: "feito" | "parcial" | "nao";
}

export interface Recipe extends Row {
  name: string;
  servings: number;
  allergens: string | null;
  substitutions: string | null;
  notes: string | null;
  favorite: boolean;
}

export interface RecipeItem extends Row {
  recipe_id: string;
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Consent extends Row {
  purpose: "termos_privacidade" | "dados_saude" | "fotos_analise" | "fotos_treinamento";
  version: string;
  granted: boolean;
}

export interface WellbeingEntry extends Row {
  logged_at: string;
  hunger_level: number | null;
  energy_level: number | null;
  symptoms: string | null;
  notes: string | null;
}

export interface Tables {
  profiles: Profile;
  user_preferences: UserPreferences;
  health_screenings: ScreeningRow;
  goals: Goal;
  weight_entries: WeightEntry;
  food_entries: FoodEntry;
  food_items: FoodItem;
  activity_entries: ActivityEntry;
  sleep_entries: SleepEntry;
  hydration_entries: HydrationEntry;
  fasting_sessions: FastingSession;
  habit_checkins: HabitCheckin;
  recipes: Recipe;
  recipe_items: RecipeItem;
  consents: Consent;
  wellbeing_entries: WellbeingEntry;
}

export type TableName = keyof Tables;
export type Insert<T extends TableName> = Omit<
  Tables[T],
  "id" | "user_id" | "created_at" | "updated_at"
>;
export type Patch<T extends TableName> = Partial<Insert<T>>;

/** Campo de data usado para filtros por período. */
export const DATE_FIELD: Partial<Record<TableName, string>> = {
  weight_entries: "measured_at",
  food_entries: "eaten_at",
  food_items: "created_at",
  activity_entries: "started_at",
  sleep_entries: "ended_at",
  hydration_entries: "drank_at",
  fasting_sessions: "started_at",
  habit_checkins: "date",
  health_screenings: "created_at",
  goals: "created_at",
  consents: "created_at",
  wellbeing_entries: "logged_at",
  recipes: "created_at",
};

export const ALL_TABLES: TableName[] = [
  "profiles",
  "user_preferences",
  "health_screenings",
  "goals",
  "weight_entries",
  "food_entries",
  "food_items",
  "activity_entries",
  "sleep_entries",
  "hydration_entries",
  "fasting_sessions",
  "habit_checkins",
  "recipes",
  "recipe_items",
  "consents",
  "wellbeing_entries",
];

export const CONSENT_VERSION = "2026-11-v1";
