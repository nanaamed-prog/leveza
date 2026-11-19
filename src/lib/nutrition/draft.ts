import type { Confidence, FoodItem } from "@/lib/data/types";
import { nutrientsFor, SEED_CONSULTED_AT, type FoodRef } from "./foods";

/** Item em edição antes de salvar. Valores nutricionais são recalculados pela base quando houver refId. */
export interface DraftItem {
  key: string;
  refId: string | null;
  name: string;
  category: string | null;
  grams: number;
  unit: "g" | "ml" | "unidade";
  quantity: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  nutrition_source: string;
  source_consulted_at: string | null;
  confidence: Confidence;
  edited: boolean;
  preparation?: string | null;
}

let n = 0;
export const draftKey = () => `d${Date.now().toString(36)}${(n++).toString(36)}`;

export function draftFromRef(
  ref: FoodRef,
  grams: number,
  confidence: Confidence = "informado",
): DraftItem {
  const nut = nutrientsFor(ref, grams);
  return {
    key: draftKey(),
    refId: ref.id,
    name: ref.name,
    category: ref.category,
    grams,
    unit: ref.unit,
    quantity: grams,
    ...nut,
    nutrition_source: ref.source,
    source_consulted_at: SEED_CONSULTED_AT,
    confidence,
    edited: false,
  };
}

export function draftFromItem(i: FoodItem): DraftItem {
  return {
    key: draftKey(),
    refId: null,
    name: i.name,
    category: i.category,
    grams: i.grams,
    unit: i.unit,
    quantity: i.quantity,
    kcal: i.kcal,
    protein_g: i.protein_g,
    carbs_g: i.carbs_g,
    fat_g: i.fat_g,
    fiber_g: i.fiber_g,
    nutrition_source: i.nutrition_source,
    source_consulted_at: i.source_consulted_at,
    confidence: i.confidence,
    edited: i.edited,
  };
}

/** Reescala um item mantendo a proporção por grama (útil ao editar porção de item sem refId). */
export function rescale(d: DraftItem, grams: number, ref?: FoodRef | null): DraftItem {
  if (ref) return { ...d, grams, quantity: grams, ...nutrientsFor(ref, grams), edited: true };
  const k = d.grams > 0 ? grams / d.grams : 0;
  return {
    ...d,
    grams,
    quantity: grams,
    kcal: d.kcal * k,
    protein_g: d.protein_g * k,
    carbs_g: d.carbs_g * k,
    fat_g: d.fat_g * k,
    fiber_g: d.fiber_g === null ? null : d.fiber_g * k,
    edited: true,
  };
}
