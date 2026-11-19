/**
 * Testa as migrações SQL reais em um Postgres embutido (PGlite):
 * isolamento entre usuários (RLS), regras de jejum/metas no banco e Storage.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// @vitest-environment node

const root = path.resolve(__dirname, "../..");
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
let db: PGlite;

async function as(user: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ""}', false);`);
  await db.exec(user ? "set role authenticated" : "set role anon");
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}

const okScreening = (u: string, extra = "") => `insert into public.health_screenings
  (user_id, birth_date, pregnant, breastfeeding, eating_disorder, diabetes, hypoglycemia_meds, clinical_conditions, consent_health_data, consent_version)
  values ('${u}', '1990-01-01', 'nao', 'nao', 'nao', 'nao', 'nao', array['nenhuma'], true, 'v1') ${extra}`;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(path.join(root, "tests/db/supabase-shim.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(path.join(dir, f), "utf8"));
  await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@x'), ('${B}', 'b@x');`);
}, 60_000);

describe("RLS — isolamento entre usuários", () => {
  it("A cria registros e só A enxerga", async () => {
    await as(
      A,
      `insert into public.weight_entries (user_id, measured_at, weight_kg) values ('${A}', now(), 70)`,
    );
    expect((await as(A, "select * from public.weight_entries")).rows).toHaveLength(1);
    expect((await as(B, "select * from public.weight_entries")).rows).toHaveLength(0);
  });

  it("B não consegue inserir em nome de A", async () => {
    await expect(
      as(
        B,
        `insert into public.weight_entries (user_id, measured_at, weight_kg) values ('${A}', now(), 80)`,
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("B não consegue alterar nem apagar dados de A (0 linhas afetadas)", async () => {
    const upd = await as(B, "update public.weight_entries set weight_kg = 99 returning id");
    expect(upd.rows).toHaveLength(0);
    const del = await as(B, "delete from public.weight_entries returning id");
    expect(del.rows).toHaveLength(0);
    const rows = (await as(A, "select weight_kg from public.weight_entries")).rows as {
      weight_kg: string;
    }[];
    expect(Number(rows[0]!.weight_kg)).toBe(70);
  });

  it("B não consegue mover registro de A para si (update com user_id)", async () => {
    const r = await as(B, `update public.weight_entries set user_id = '${B}' returning id`);
    expect(r.rows).toHaveLength(0);
  });

  it("A não consegue transferir o próprio registro para B", async () => {
    await expect(as(A, `update public.weight_entries set user_id = '${B}'`)).rejects.toThrow(
      /row-level security/,
    );
  });

  it("item de refeição não pode apontar para refeição de outra pessoa", async () => {
    const e = await as(
      A,
      `insert into public.food_entries (user_id, eaten_at, meal, total_kcal) values ('${A}', now(), 'almoco', 300) returning id`,
    );
    const entryId = (e.rows[0] as { id: string }).id;
    await expect(
      as(
        B,
        `insert into public.food_items (user_id, food_entry_id, name, quantity, unit, grams, kcal, protein_g, carbs_g, fat_g, nutrition_source, confidence)
             values ('${B}', '${entryId}', 'x', 100, 'g', 100, 100, 1, 1, 1, 'teste', 'informado')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("anônimo não lê nada", async () => {
    await expect(as(null, "select * from public.weight_entries")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("triagem e consentimentos são somente-inclusão (sem update/delete)", async () => {
    await as(A, okScreening(A));
    const upd = await as(A, "update public.health_screenings set pregnant = 'sim' returning id");
    expect(upd.rows).toHaveLength(0);
    const del = await as(A, "delete from public.health_screenings returning id");
    expect(del.rows).toHaveLength(0);
  });

  it("todas as tabelas públicas têm RLS ativo", async () => {
    const r = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'",
    );
    expect(r.rows.length).toBeGreaterThanOrEqual(16);
    expect(r.rows.filter((x) => !x.relrowsecurity).map((x) => x.relname)).toEqual([]);
  });
});

describe("Regras de segurança no banco", () => {
  const fast = (u: string, h: number, pro = false, pro24 = false) =>
    `insert into public.fasting_sessions (user_id, protocol_hours, started_at, expected_end_at, professional_confirmed, professional_24h_confirmed)
     values ('${u}', ${h}, now(), now() + interval '${h} hours', ${pro}, ${pro24}) returning id`;

  it("sem triagem não inicia jejum", async () => {
    await expect(as(B, fast(B, 12))).rejects.toThrow(/fasting_not_allowed/);
  });

  it("adulto elegível inicia 16 h; 18 h exige confirmação; 24 h exige confirmação específica", async () => {
    const r = await as(A, fast(A, 16));
    const id = (r.rows[0] as { id: string }).id;
    await as(A, `update public.fasting_sessions set ended_at = now() where id = '${id}'`);
    await expect(as(A, fast(A, 18))).rejects.toThrow(/fasting_not_allowed/);
    const r18 = await as(A, fast(A, 18, true));
    await as(
      A,
      `update public.fasting_sessions set ended_at = now() where id = '${(r18.rows[0] as { id: string }).id}'`,
    );
    await expect(as(A, fast(A, 24, true, false))).rejects.toThrow(/fasting_not_allowed/);
  });

  it("apenas um jejum ativo por vez", async () => {
    await as(A, fast(A, 12));
    await expect(as(A, fast(A, 14))).rejects.toThrow(/duplicate key|unique/);
  });

  it("não é possível alterar protocolo de jejum existente", async () => {
    await expect(
      as(A, "update public.fasting_sessions set protocol_hours = 24 where ended_at is null"),
    ).rejects.toThrow(/fasting_not_allowed/);
  });

  it("nova triagem indicando amamentação encerra jejum ativo e bloqueia novos", async () => {
    await as(
      A,
      `insert into public.health_screenings
      (user_id, birth_date, pregnant, breastfeeding, eating_disorder, diabetes, hypoglycemia_meds, clinical_conditions, consent_health_data, consent_version)
      values ('${A}', '1990-01-01', 'nao', 'sim', 'nao', 'nao', 'nao', array['nenhuma'], true, 'v1')`,
    );
    const active = await as(A, "select id from public.fasting_sessions where ended_at is null");
    expect(active.rows).toHaveLength(0);
    await expect(as(A, fast(A, 12))).rejects.toThrow(/fasting_not_allowed/);
  });

  it("menor de 18: meta de perda de peso é bloqueada no banco", async () => {
    await as(
      B,
      `insert into public.health_screenings
      (user_id, birth_date, pregnant, breastfeeding, eating_disorder, diabetes, hypoglycemia_meds, clinical_conditions, consent_health_data, consent_version)
      values ('${B}', (current_date - interval '15 years')::date, 'nao', 'nao', 'nao', 'nao', 'nao', array['nenhuma'], true, 'v1')`,
    );
    await expect(
      as(B, `insert into public.goals (user_id, type) values ('${B}', 'perder')`),
    ).rejects.toThrow(/goal_not_allowed/);
    await as(B, `insert into public.goals (user_id, type) values ('${B}', 'habitos')`);
  });

  it("meta calórica abaixo de 1.200 kcal é rejeitada", async () => {
    await expect(
      as(
        A,
        `insert into public.goals (user_id, type, kcal_target, status) values ('${A}', 'manter', 900, 'encerrada')`,
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("valores fora de faixa são rejeitados (peso, água, sono)", async () => {
    await expect(
      as(
        A,
        `insert into public.weight_entries (user_id, measured_at, weight_kg) values ('${A}', now(), 5)`,
      ),
    ).rejects.toThrow(/check/);
    await expect(
      as(
        A,
        `insert into public.hydration_entries (user_id, drank_at, volume_ml) values ('${A}', now(), 9000)`,
      ),
    ).rejects.toThrow(/check/);
    await expect(
      as(
        A,
        `insert into public.sleep_entries (user_id, started_at, ended_at) values ('${A}', now(), now() - interval '1 hour')`,
      ),
    ).rejects.toThrow(/check/);
  });
});

describe("Storage de fotos", () => {
  beforeAll(async () => {
    // O bucket é criado pela migração
    const b = await db.query<{ public: boolean }>(
      "select public from storage.buckets where id = 'food-photos'",
    );
    expect(b.rows[0]!.public).toBe(false);
  });

  it("dono envia para a própria pasta; outro usuário não lê nem envia lá", async () => {
    const name = `${A}/11111111-1111-4111-8111-111111111111.jpg`;
    await as(
      A,
      `insert into storage.objects (bucket_id, name, owner) values ('food-photos', '${name}', '${A}')`,
    );
    expect((await as(A, "select name from storage.objects")).rows).toHaveLength(1);
    expect((await as(B, "select name from storage.objects")).rows).toHaveLength(0);
    await expect(
      as(
        B,
        `insert into storage.objects (bucket_id, name, owner) values ('food-photos', '${A}/22222222-2222-4222-8222-222222222222.jpg', '${B}')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("rejeita nomes de arquivo fora do padrão", async () => {
    await expect(
      as(
        A,
        `insert into storage.objects (bucket_id, name, owner) values ('food-photos', '${A}/../segredo.php', '${A}')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("Assinaturas — ninguém se dá um plano pelo app", () => {
  it("usuário não insere nem altera a própria assinatura", async () => {
    await expect(
      as(
        A,
        `insert into public.subscriptions (user_id, plan, status, current_period_end) values ('${A}', 'plus_ia', 'active', now() + interval '1 year')`,
      ),
    ).rejects.toThrow(/permission denied|row-level security/);
  });

  it("teste grátis de 7 dias funciona uma única vez", async () => {
    const r = await as(A, "select plan, status from public.start_trial()");
    expect(r.rows[0]).toMatchObject({ plan: "plus", status: "trial" });
    await expect(as(A, "select * from public.start_trial()")).rejects.toThrow(/trial_unavailable/);
    const upd = await as(
      A,
      "update public.subscriptions set plan = 'plus_ia' returning user_id",
    ).catch((e: Error) => e);
    expect(upd instanceof Error ? upd.message : "").toMatch(/permission denied/);
  });

  it("B não vê a assinatura de A", async () => {
    expect((await as(B, "select * from public.subscriptions")).rows).toHaveLength(0);
  });

  it("uso de IA: cada um registra e vê só o próprio", async () => {
    await as(A, `insert into public.ai_usage (user_id, kind) values ('${A}', 'foto')`);
    await expect(
      as(B, `insert into public.ai_usage (user_id, kind) values ('${A}', 'foto')`),
    ).rejects.toThrow(/row-level security/);
    expect((await as(B, "select * from public.ai_usage")).rows).toHaveLength(0);
  });
});
