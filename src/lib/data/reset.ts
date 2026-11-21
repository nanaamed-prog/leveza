import type { DataStore } from "./store";
import type { TableName } from "./types";
import { dayRange } from "@/lib/dates";

/** Registros do dia a dia que podem ser apagados (perfil, triagem, metas, receitas e consentimentos ficam). */
export const DAILY_TABLES = [
  "food_entries",
  "activity_entries",
  "sleep_entries",
  "hydration_entries",
  "fasting_sessions",
  "habit_checkins",
  "bowel_entries",
  "wellbeing_entries",
] as const satisfies readonly TableName[];

type PhotoRemover = (paths: string[]) => Promise<void>;

async function removePhotos(store: DataStore, ids: string[], removeFiles?: PhotoRemover) {
  if (!removeFiles || store.kind !== "supabase" || ids.length === 0) return;
  const entries = await store.list("food_entries", { in: { field: "id", values: ids } });
  const paths = entries.map((e) => e.photo_path).filter((p): p is string => Boolean(p));
  if (paths.length) await removeFiles(paths);
}

/** Apaga todos os registros de um dia (no fuso da pessoa). Devolve quantos itens saíram. */
export async function resetDay(
  store: DataStore,
  day: string,
  tz: string,
  opts: { includeWeight: boolean; removeFiles?: PhotoRemover },
): Promise<number> {
  const { start, end } = dayRange(day, tz);
  const from = new Date(start).toISOString();
  const to = new Date(end).toISOString();
  const tables: TableName[] = [
    ...DAILY_TABLES,
    ...(opts.includeWeight ? ["weight_entries" as const] : []),
  ];
  let count = 0;
  for (const t of tables) {
    const rows =
      t === "habit_checkins"
        ? await store.list(t, { eq: { date: day }, limit: 1000 })
        : await store.list(t, { from, to, limit: 1000 });
    if (t === "food_entries")
      await removePhotos(
        store,
        rows.map((r) => r.id),
        opts.removeFiles,
      );
    for (const r of rows) await store.remove(t, r.id);
    count += rows.length;
  }
  return count;
}

/** Apaga os registros de todos os dias. O peso só sai se a pessoa pedir. */
export async function resetAllDays(
  store: DataStore,
  opts: { includeWeight: boolean; removeFiles?: PhotoRemover },
): Promise<void> {
  const tables: TableName[] = [
    ...DAILY_TABLES,
    "food_items",
    ...(opts.includeWeight ? ["weight_entries" as const] : []),
  ];
  for (const t of tables) {
    if (t === "food_entries" && store.kind === "supabase" && opts.removeFiles) {
      const withPhoto = (await store.list(t, { limit: 10000 })).filter((e) => e.photo_path);
      await removePhotos(
        store,
        withPhoto.map((e) => e.id),
        opts.removeFiles,
      );
    }
    // Remove em lote por usuário: o RLS (e o filtro user_id) garante que só os próprios dados saem.
    await store.removeWhere(t, "user_id", store.userId);
  }
}
