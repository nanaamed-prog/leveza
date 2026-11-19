import type { SupabaseClient } from "@supabase/supabase-js";
import { DATE_FIELD, type Insert, type Patch, type TableName, type Tables } from "./types";

export interface ListOptions {
  from?: string; // inclusivo (ISO ou YYYY-MM-DD conforme o campo)
  to?: string; // exclusivo
  eq?: Record<string, string | number | boolean>;
  /** Filtro "campo IN (valores)". Lista vazia retorna vazio. */
  in?: { field: string; values: string[] };
  order?: "asc" | "desc";
  limit?: number;
}

/** Interface única de dados. As telas não sabem se estão no modo demonstração ou no Supabase. */
export interface DataStore {
  kind: "demo" | "supabase";
  userId: string;
  list<T extends TableName>(table: T, opts?: ListOptions): Promise<Tables[T][]>;
  getSingle<T extends "profiles" | "user_preferences">(table: T): Promise<Tables[T] | null>;
  upsertSingle<T extends "profiles" | "user_preferences">(
    table: T,
    row: Insert<T>,
  ): Promise<Tables[T]>;
  insert<T extends TableName>(table: T, row: Insert<T>): Promise<Tables[T]>;
  insertMany<T extends TableName>(table: T, rows: Insert<T>[]): Promise<Tables[T][]>;
  update<T extends TableName>(table: T, id: string, patch: Patch<T>): Promise<Tables[T]>;
  remove(table: TableName, id: string): Promise<void>;
  removeWhere(table: TableName, field: string, value: string): Promise<void>;
  /** Apaga todos os dados do usuário (modo demo) — no Supabase a exclusão passa pela API segura. */
  wipeAll(): Promise<void>;
}

function nowIso() {
  return new Date().toISOString();
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function sortRows<R>(rows: R[], field: string, order: "asc" | "desc"): R[] {
  return [...rows].sort((a, b) => {
    const va = String((a as Record<string, unknown>)[field] ?? "");
    const vb = String((b as Record<string, unknown>)[field] ?? "");
    return order === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });
}

/* ------------------------------------------------------------------ */
/* Modo demonstração: dados apenas neste aparelho (localStorage).       */
/* ------------------------------------------------------------------ */

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000000";
const PREFIX = "leveza:demo:v1:";

/** localStorage com fallback em memória (navegadores/janelas que bloqueiam o armazenamento). */
const memory = new Map<string, string>();
export const safeStorage = {
  get(k: string): string | null {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  set(k: string, v: string) {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      memory.set(k, v);
    }
  },
  remove(k: string) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
    memory.delete(k);
  },
  keys(): string[] {
    const out = new Set(memory.keys());
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k) out.add(k);
      }
    } catch {
      /* ignore */
    }
    return [...out];
  },
};

export class LocalStore implements DataStore {
  kind = "demo" as const;
  userId = DEMO_USER_ID;

  private read<T extends TableName>(table: T): Tables[T][] {
    if (typeof window === "undefined") return [];
    try {
      const raw = safeStorage.get(PREFIX + table);
      return raw ? (JSON.parse(raw) as Tables[T][]) : [];
    } catch {
      return [];
    }
  }

  private write<T extends TableName>(table: T, rows: Tables[T][]) {
    safeStorage.set(PREFIX + table, JSON.stringify(rows));
  }

  async list<T extends TableName>(table: T, opts: ListOptions = {}): Promise<Tables[T][]> {
    const field = DATE_FIELD[table] ?? "created_at";
    let rows = this.read(table).filter((r) => {
      const v = String((r as unknown as Record<string, unknown>)[field] ?? "");
      if (opts.from && v < opts.from) return false;
      if (opts.to && v >= opts.to) return false;
      if (
        opts.in &&
        !opts.in.values.includes(String((r as unknown as Record<string, unknown>)[opts.in.field]))
      )
        return false;
      if (opts.eq) {
        for (const [k, val] of Object.entries(opts.eq)) {
          if ((r as unknown as Record<string, unknown>)[k] !== val) return false;
        }
      }
      return true;
    });
    rows = sortRows(rows, field, opts.order ?? "desc");
    return opts.limit ? rows.slice(0, opts.limit) : rows;
  }

  async getSingle<T extends "profiles" | "user_preferences">(table: T): Promise<Tables[T] | null> {
    return this.read(table)[0] ?? null;
  }

  async upsertSingle<T extends "profiles" | "user_preferences">(
    table: T,
    row: Insert<T>,
  ): Promise<Tables[T]> {
    const existing = this.read(table)[0];
    const t = nowIso();
    const next = {
      ...(existing ?? { id: this.userId, created_at: t }),
      ...row,
      user_id: this.userId,
      updated_at: t,
    } as Tables[T];
    this.write(table, [next]);
    return next;
  }

  async insert<T extends TableName>(table: T, row: Insert<T>): Promise<Tables[T]> {
    const [r] = await this.insertMany(table, [row]);
    return r!;
  }

  async insertMany<T extends TableName>(table: T, rows: Insert<T>[]): Promise<Tables[T][]> {
    const t = nowIso();
    const created = rows.map(
      (row) =>
        ({ ...row, id: uuid(), user_id: this.userId, created_at: t, updated_at: t }) as Tables[T],
    );
    this.write(table, [...this.read(table), ...created]);
    return created;
  }

  async update<T extends TableName>(table: T, id: string, patch: Patch<T>): Promise<Tables[T]> {
    const rows = this.read(table);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error("Registro não encontrado.");
    const next = { ...rows[idx]!, ...patch, updated_at: nowIso() } as Tables[T];
    rows[idx] = next;
    this.write(table, rows);
    return next;
  }

  async remove(table: TableName, id: string): Promise<void> {
    this.write(
      table,
      this.read(table).filter((r) => r.id !== id),
    );
    if (table === "food_entries") await this.removeWhere("food_items", "food_entry_id", id);
    if (table === "recipes") await this.removeWhere("recipe_items", "recipe_id", id);
  }

  async removeWhere(table: TableName, field: string, value: string): Promise<void> {
    this.write(
      table,
      this.read(table).filter((r) => (r as unknown as Record<string, unknown>)[field] !== value),
    );
  }

  async wipeAll(): Promise<void> {
    safeStorage
      .keys()
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => safeStorage.remove(k));
  }
}

/* ------------------------------------------------------------------ */
/* Supabase: RLS garante que cada usuário só acessa os próprios dados.   */
/* ------------------------------------------------------------------ */

export class SupabaseStore implements DataStore {
  kind = "supabase" as const;
  constructor(
    private client: SupabaseClient,
    public userId: string,
  ) {}

  private fail(error: { message: string } | null): never | void {
    if (error) throw new Error(friendlyDbError(error.message));
  }

  async list<T extends TableName>(table: T, opts: ListOptions = {}): Promise<Tables[T][]> {
    const field = DATE_FIELD[table] ?? "created_at";
    if (opts.in && opts.in.values.length === 0) return [];
    let q = this.client.from(table).select("*").eq("user_id", this.userId);
    if (opts.from) q = q.gte(field, opts.from);
    if (opts.to) q = q.lt(field, opts.to);
    if (opts.eq) for (const [k, v] of Object.entries(opts.eq)) q = q.eq(k, v);
    if (opts.in) q = q.in(opts.in.field, opts.in.values);
    q = q.order(field, { ascending: (opts.order ?? "desc") === "asc" });
    q = q.limit(opts.limit ?? 1000); // paginação: limite padrão
    const { data, error } = await q;
    this.fail(error);
    return (data ?? []) as Tables[T][];
  }

  async getSingle<T extends "profiles" | "user_preferences">(table: T): Promise<Tables[T] | null> {
    const { data, error } = await this.client
      .from(table)
      .select("*")
      .eq("user_id", this.userId)
      .maybeSingle();
    this.fail(error);
    return (data as Tables[T] | null) ?? null;
  }

  async upsertSingle<T extends "profiles" | "user_preferences">(
    table: T,
    row: Insert<T>,
  ): Promise<Tables[T]> {
    const { data, error } = await this.client
      .from(table)
      .upsert({ ...row, id: this.userId, user_id: this.userId }, { onConflict: "user_id" })
      .select()
      .single();
    this.fail(error);
    return data as Tables[T];
  }

  async insert<T extends TableName>(table: T, row: Insert<T>): Promise<Tables[T]> {
    const { data, error } = await this.client
      .from(table)
      .insert({ ...row, user_id: this.userId })
      .select()
      .single();
    this.fail(error);
    return data as Tables[T];
  }

  async insertMany<T extends TableName>(table: T, rows: Insert<T>[]): Promise<Tables[T][]> {
    if (rows.length === 0) return [];
    const { data, error } = await this.client
      .from(table)
      .insert(rows.map((r) => ({ ...r, user_id: this.userId })))
      .select();
    this.fail(error);
    return (data ?? []) as Tables[T][];
  }

  async update<T extends TableName>(table: T, id: string, patch: Patch<T>): Promise<Tables[T]> {
    const { data, error } = await this.client
      .from(table)
      .update(patch as Record<string, unknown>)
      .eq("id", id)
      .eq("user_id", this.userId)
      .select()
      .single();
    this.fail(error);
    return data as Tables[T];
  }

  async remove(table: TableName, id: string): Promise<void> {
    const { error } = await this.client
      .from(table)
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);
    this.fail(error);
  }

  async removeWhere(table: TableName, field: string, value: string): Promise<void> {
    const { error } = await this.client
      .from(table)
      .delete()
      .eq(field, value)
      .eq("user_id", this.userId);
    this.fail(error);
  }

  async wipeAll(): Promise<void> {
    throw new Error("Use a exclusão de conta em Configurações.");
  }
}

/** Mensagens amigáveis sem vazar detalhes internos. */
export function friendlyDbError(msg: string): string {
  if (/fasting_not_allowed/i.test(msg))
    return "Este protocolo de jejum não está disponível para o seu perfil de triagem.";
  if (/violates check constraint/i.test(msg))
    return "Algum valor está fora do intervalo permitido. Confira os campos.";
  if (/row-level security/i.test(msg)) return "Você não tem permissão para esta ação.";
  if (/JWT|token/i.test(msg)) return "Sua sessão expirou. Entre novamente.";
  return "Não foi possível salvar agora. Tente novamente.";
}
