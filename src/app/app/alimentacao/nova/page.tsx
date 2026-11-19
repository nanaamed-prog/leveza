"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, PenLine, Plus, Search, Sparkles, WandSparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { VoiceInput } from "@/components/leveza/VoiceInput";
import { parseMealDescription, EXAMPLE_DESCRIPTION } from "@/lib/nutrition/parseMeal";
import { Sheet } from "@/components/ui/dialog";
import { FoodItemsEditor } from "@/components/leveza/FoodItemsEditor";
import { FoodPhotoCapture } from "@/components/leveza/FoodPhotoCapture";
import { useAppData } from "@/lib/data/provider";
import { MEAL_LABELS, type Meal } from "@/lib/data/types";
import { FOODS, searchFoods, bestMatch, type FoodRef } from "@/lib/nutrition/foods";
import { draftFromItem, draftFromRef, draftKey, type DraftItem } from "@/lib/nutrition/draft";
import { fromLocalInput, toLocalInput } from "@/lib/dates";
import { fmtInt } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { getSupabase } from "@/lib/supabase/client";
import { LoadingSkeleton } from "@/components/leveza/LoadingSkeleton";
import { PlusGate } from "@/components/leveza/PlusGate";
import { usePlan } from "@/lib/data/usePlan";

function guessMeal(ms: number, tz: string): Meal {
  const h = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(
      ms,
    ),
  );
  if (h < 10) return "cafe";
  if (h < 15) return "almoco";
  if (h < 18) return "lanche";
  if (h < 22) return "jantar";
  return "ceia";
}

interface AnalyzedItem {
  name: string;
  grams: number;
  preparation: string | null;
  confidence: "alta" | "media" | "baixa";
}

function unmatchedDraft(name: string, grams: number, preparation: string | null): DraftItem {
  return {
    key: draftKey(),
    refId: null,
    name,
    category: null,
    grams: grams > 0 ? grams : 100,
    unit: "g",
    quantity: grams > 0 ? grams : 100,
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: null,
    nutrition_source: "Não encontrado na base — preencha os valores",
    source_consulted_at: null,
    confidence: "baixa",
    edited: false,
    preparation,
  };
}

function aiItemsToDrafts(list: AnalyzedItem[]): DraftItem[] {
  return list.map((it) => {
    const ref = bestMatch(it.name);
    if (ref) return { ...draftFromRef(ref, it.grams, it.confidence), preparation: it.preparation };
    return unmatchedDraft(it.name, it.grams, it.preparation);
  });
}

function NewMealInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { store, tz, preferences, refresh } = useAppData();
  const plan = usePlan();
  const editId = params.get("entrada");
  const [tab, setTab] = useState<"busca" | "descrever" | "foto">(() => {
    const m = params.get("modo");
    return m === "foto" ? "foto" : m === "descrever" ? "descrever" : "busca";
  });
  const [description, setDescription] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [when, setWhen] = useState(() => toLocalInput(Date.now(), tz));
  const [meal, setMeal] = useState<Meal>(
    () => (params.get("refeicao") as Meal) || guessMeal(Date.now(), tz),
  );
  const [items, setItems] = useState<DraftItem[]>([]);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<FoodRef | null>(null);
  const [custom, setCustom] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [aiStatus, setAiStatus] = useState<"verificando" | "disponivel" | "indisponivel">(
    "verificando",
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));

  // Carrega registro para edição
  useEffect(() => {
    if (!editId || !store) return;
    (async () => {
      const [entry] = await store.list("food_entries", { eq: { id: editId }, limit: 1 });
      if (entry) {
        setWhen(toLocalInput(Date.parse(entry.eaten_at), tz));
        setMeal(entry.meal);
        const its = await store.list("food_items", {
          eq: { food_entry_id: entry.id },
          order: "asc",
        });
        setItems(its.map(draftFromItem));
      }
      setLoadingEdit(false);
    })();
  }, [editId, store, tz]);

  // IA disponível? (rota server-side informa se há provedor configurado)
  useEffect(() => {
    apiFetch("/api/analisar-prato", { method: "GET" })
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((j: { configured?: boolean }) =>
        setAiStatus(j.configured ? "disponivel" : "indisponivel"),
      )
      .catch(() => setAiStatus("indisponivel"));
  }, []);

  const results = useMemo(() => searchFoods(query, 15), [query]);
  const total = items.reduce((s, i) => s + i.kcal, 0);

  async function analyze() {
    if (!photo) return;
    setAnalyzing(true);
    setError(null);
    setAnalysisNote(null);
    try {
      const body = new FormData();
      body.append("foto", photo, "refeicao.jpg");
      const res = await apiFetch("/api/analisar-prato", { method: "POST", body });
      const json = (await res.json()) as { items?: AnalyzedItem[]; error?: string; note?: string };
      if (!res.ok || !json.items)
        throw new Error(json.error ?? "Não foi possível analisar a foto.");
      const drafts = aiItemsToDrafts(json.items);
      setItems((prev) => [...prev, ...drafts]);
      setAnalysisNote(
        json.note ??
          "Revise cada item: a foto não tem precisão de balança. Confira porções, modo de preparo e se houve óleo, molho ou açúcar.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Falha na análise. Você pode registrar manualmente.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  /** Descrição por texto/voz → itens. Usa IA no servidor quando configurada; senão, o interpretador local. */
  async function interpret() {
    const text = description.trim();
    if (text.length < 2) return setError("Escreva ou fale o que você comeu.");
    setInterpreting(true);
    setError(null);
    setAnalysisNote(null);
    let drafts: DraftItem[] | null = null;
    if (aiStatus === "disponivel" && plan.can("ia_texto")) {
      try {
        const res = await apiFetch("/api/interpretar-refeicao", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ texto: text }),
        });
        const json = (await res.json()) as { items?: AnalyzedItem[] };
        if (res.ok && json.items) drafts = aiItemsToDrafts(json.items);
      } catch {
        drafts = null;
      }
    }
    if (!drafts) {
      drafts = parseMealDescription(text).map((p) =>
        p.food
          ? { ...draftFromRef(p.food, p.grams, p.confidence), preparation: p.portionLabel }
          : unmatchedDraft(p.text.trim(), 0, null),
      );
    }
    setInterpreting(false);
    if (drafts.length === 0)
      return setError("Não encontrei alimentos nesse texto. Tente separar por vírgulas.");
    setItems((prev) => [...prev, ...drafts!]);
    const missing = drafts.filter((d) => !d.refId).length;
    setAnalysisNote(
      missing > 0
        ? `Encontrei ${drafts.length - missing} de ${drafts.length} alimentos. Os marcados como “confiança baixa” e sem valores não estão na base: ajuste o nome, preencha os valores ou remova.`
        : "Pronto! Confira as porções abaixo antes de salvar — elas são estimadas pela medida que você citou.",
    );
    setDescription("");
  }

  async function save() {
    if (!store) return;
    if (items.length === 0) return setError("Adicione pelo menos um alimento.");
    if (items.some((i) => !i.name.trim() || !(i.grams > 0)))
      return setError("Confira nome e porção de todos os itens.");
    setSaving(true);
    setError(null);
    try {
      const eatenAt = new Date(fromLocalInput(when, tz)).toISOString();
      const fields = {
        eaten_at: eatenAt,
        meal,
        source: (photo ? "foto_ia" : "manual") as "foto_ia" | "manual",
        total_kcal: Math.round(total * 10) / 10,
        notes: null,
      };
      let entryId = editId;
      if (editId) {
        await store.update("food_entries", editId, fields);
        await store.removeWhere("food_items", "food_entry_id", editId);
      } else {
        const e = await store.insert("food_entries", { ...fields, photo_path: null });
        entryId = e.id;
      }
      await store.insertMany(
        "food_items",
        items.map((i) => ({
          food_entry_id: entryId!,
          name: i.name.trim(),
          category: i.category,
          quantity: i.quantity,
          unit: i.unit,
          grams: i.grams,
          kcal: i.kcal,
          protein_g: i.protein_g,
          carbs_g: i.carbs_g,
          fat_g: i.fat_g,
          fiber_g: i.fiber_g,
          nutrition_source: i.nutrition_source,
          source_consulted_at: i.source_consulted_at,
          confidence: i.confidence,
          edited: i.edited,
        })),
      );
      // Foto: só é guardada se a pessoa escolheu guardar (padrão: não guardar).
      if (photo && store.kind === "supabase" && preferences?.photo_retention !== "nao_guardar") {
        const sb = getSupabase()!;
        const path = `${store.userId}/${entryId}.jpg`;
        const { error: upErr } = await sb.storage
          .from("food-photos")
          .upload(path, photo, { contentType: "image/jpeg", upsert: true });
        if (!upErr) await store.update("food_entries", entryId!, { photo_path: path });
      }
      refresh();
      router.push("/app/alimentacao");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingEdit) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <PageHeader title={editId ? "Editar refeição" : "Nova refeição"} back="/app/alimentacao" />

      <Card className="grid grid-cols-2 gap-3">
        <Field label="Refeição">
          {({ id }) => (
            <Select id={id} value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
              {(Object.keys(MEAL_LABELS) as Meal[]).map((m) => (
                <option key={m} value={m}>
                  {MEAL_LABELS[m]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Data e hora">
          {({ id }) => (
            <Input
              id={id}
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          )}
        </Field>
      </Card>

      {!editId && (
        <div
          role="tablist"
          aria-label="Forma de registro"
          className="grid grid-cols-3 rounded-button bg-line/60 p-1"
        >
          {(
            [
              ["busca", "Buscar", Search],
              ["descrever", "Descrever", PenLine],
              ["foto", "Foto", Camera],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-[12px] text-sm font-semibold ${tab === k ? "bg-card text-forest shadow-card" : "text-muted"}`}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
      )}

      {tab === "descrever" && !editId ? (
        <Card className="space-y-3">
          <CardTitle>Conte o que você comeu</CardTitle>
          <CardHint>
            Escreva ou fale do seu jeito, com as quantidades se souber. Nós encontramos os alimentos
            e você confere antes de salvar.
          </CardHint>
          <Field label="O que você comeu?" hint={`Exemplo: “${EXAMPLE_DESCRIPTION}”`}>
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                rows={4}
                placeholder="Ex.: arroz, feijão, um filé de frango e salada"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
          <VoiceInput onText={(t) => setDescription((d) => (d ? `${d}, ${t}` : t))} />
          <Button
            block
            onClick={interpret}
            disabled={interpreting || description.trim().length < 2}
          >
            <WandSparkles /> {interpreting ? "Procurando alimentos…" : "Encontrar alimentos"}
          </Button>
        </Card>
      ) : tab === "busca" || editId ? (
        <Card className="space-y-3">
          <Field label="Buscar na base nutricional">
            {({ id }) => (
              <Input
                id={id}
                type="search"
                placeholder="Ex.: arroz, feijão, ovo"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            )}
          </Field>
          <ul className="max-h-72 divide-y divide-line overflow-y-auto">
            {results.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setPicked(f)}
                  className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold text-ink">{f.name}</span>
                    <span className="text-xs text-muted">
                      {fmtInt(f.per100.kcal)} kcal por 100 {f.unit}
                    </span>
                  </span>
                  <Plus className="size-5 text-forest" aria-hidden />
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="py-3 text-sm text-muted">
                Nada encontrado. Adicione como alimento personalizado.
              </li>
            )}
          </ul>
          <Button variant="outline" block onClick={() => setCustom(true)}>
            <Plus /> Alimento personalizado
          </Button>
        </Card>
      ) : (
        <PlusGate
          feature="ia_foto"
          title="Foto do prato com IA"
          text="Tire uma foto e a IA sugere os alimentos e as porções para você revisar. Disponível no Leveza Plus IA. A busca e o “Descrever” continuam grátis."
        >
          <Card className="space-y-3">
            <CardTitle>Foto do prato</CardTitle>
            {aiStatus === "indisponivel" ? (
              <CardHint>
                A análise por foto não está configurada neste ambiente (é preciso uma chave de IA no
                servidor). O registro manual continua funcionando normalmente.
              </CardHint>
            ) : (
              <CardHint>
                A IA sugere alimentos e porções aproximadas. Você revisa tudo antes de salvar.
              </CardHint>
            )}
            <FoodPhotoCapture onReady={(b) => setPhoto(b)} disabled={aiStatus !== "disponivel"} />
            <Button
              block
              onClick={analyze}
              disabled={!photo || analyzing || aiStatus !== "disponivel"}
            >
              <Sparkles /> {analyzing ? "Analisando…" : "Analisar foto"}
            </Button>
            {aiStatus === "indisponivel" && (
              <Button variant="secondary" block onClick={() => setTab("busca")}>
                Registrar manualmente
              </Button>
            )}
          </Card>
        </PlusGate>
      )}

      {analysisNote && (
        <p className="rounded-xl bg-orange-soft px-3 py-2 text-sm text-orange-ink">
          {analysisNote}
        </p>
      )}

      <section aria-labelledby="itens-titulo" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="itens-titulo" className="font-display text-base font-semibold">
            Itens da refeição
          </h2>
          <span className="tabular text-sm font-semibold text-forest">{fmtInt(total)} kcal</span>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted">Nenhum item adicionado ainda.</p>
        ) : (
          <FoodItemsEditor items={items} onChange={setItems} />
        )}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="w-full text-xs font-semibold text-muted">
              Teve óleo, molho ou açúcar? Adicione:
            </span>
            {["azeite", "oleo_soja", "manteiga", "acucar"].map((id) => {
              const ref = FOODS.find((f) => f.id === id)!;
              return (
                <button
                  key={id}
                  type="button"
                  className="min-h-10 rounded-full border border-line bg-card px-3 text-xs font-semibold text-forest"
                  onClick={() => setItems((p) => [...p, draftFromRef(ref, ref.portions[0]!.grams)])}
                >
                  + {ref.name} ({ref.portions[0]!.label})
                </button>
              );
            })}
          </div>
        )}
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-error-soft px-3 py-2 text-sm font-semibold text-error"
        >
          {error}
        </p>
      )}
      <Button block size="lg" onClick={save} disabled={saving || items.length === 0}>
        {saving ? "Salvando…" : "Salvar refeição"}
      </Button>

      <PortionSheet
        key={picked?.id ?? "nenhum"}
        food={picked}
        onClose={() => setPicked(null)}
        onAdd={(d) => {
          setItems((p) => [...p, d]);
          setPicked(null);
          setQuery("");
        }}
      />
      <CustomFoodSheet
        open={custom}
        onOpenChange={setCustom}
        onAdd={(d) => {
          setItems((p) => [...p, d]);
          setCustom(false);
        }}
      />
    </div>
  );
}

function PortionSheet({
  food,
  onClose,
  onAdd,
}: {
  food: FoodRef | null;
  onClose: () => void;
  onAdd: (d: DraftItem) => void;
}) {
  const [base, setBase] = useState(() => food?.portions[0]?.grams ?? 100);
  const [mult, setMult] = useState(1);
  const [grams, setGrams] = useState(() => String(food?.portions[0]?.grams ?? 100));
  const g = Number(grams.replace(",", "."));
  const choose = (b: number, m: number) => {
    setBase(b);
    setMult(m);
    setGrams(String(Math.round(b * m * 10) / 10));
  };
  return (
    <Sheet
      open={Boolean(food)}
      onOpenChange={(o) => !o && onClose()}
      title={food?.name ?? ""}
      description="Informe a porção consumida."
    >
      {food && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {food.portions.map((p) => (
              <Button
                key={p.label}
                variant="secondary"
                size="sm"
                onClick={() => choose(p.grams, mult)}
              >
                {p.label} ({p.grams} {food.unit})
              </Button>
            ))}
          </div>
          <div
            role="group"
            aria-label="Quantas porções"
            className="grid grid-cols-4 gap-1 rounded-button bg-line/60 p-1"
          >
            {[
              ["½", 0.5],
              ["1", 1],
              ["1½", 1.5],
              ["2", 2],
            ].map(([label, m]) => (
              <button
                key={label}
                type="button"
                aria-pressed={mult === m}
                onClick={() => choose(base, m as number)}
                className={`min-h-10 rounded-[12px] text-sm font-bold ${mult === m ? "bg-card text-forest shadow-card" : "text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Field label={`Quantidade (${food.unit})`}>
            {({ id }) => (
              <Input
                id={id}
                inputMode="decimal"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
              />
            )}
          </Field>
          <p className="tabular text-sm text-muted">
            ≈ {fmtInt((food.per100.kcal * (g || 0)) / 100)} kcal
          </p>
          <Button
            block
            disabled={!(g > 0 && g <= 5000)}
            onClick={() => onAdd(draftFromRef(food, g))}
          >
            Adicionar
          </Button>
          <p className="text-xs text-muted">Fonte: {food.source}</p>
        </div>
      )}
    </Sheet>
  );
}

function CustomFoodSheet({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (d: DraftItem) => void;
}) {
  const [v, setV] = useState({ name: "", grams: "", kcal: "", p: "", c: "", f: "" });
  const num = (s: string) => Number(s.replace(",", ".")) || 0;
  const valid = v.name.trim() && num(v.grams) > 0;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Alimento personalizado"
      description="Use os valores do rótulo ou de uma fonte confiável."
    >
      <div className="space-y-3">
        <Field label="Nome">
          {({ id }) => (
            <Input id={id} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Porção (g)">
            {({ id }) => (
              <Input
                id={id}
                inputMode="decimal"
                value={v.grams}
                onChange={(e) => setV({ ...v, grams: e.target.value })}
              />
            )}
          </Field>
          <Field label="Energia (kcal)">
            {({ id }) => (
              <Input
                id={id}
                inputMode="decimal"
                value={v.kcal}
                onChange={(e) => setV({ ...v, kcal: e.target.value })}
              />
            )}
          </Field>
          <Field label="Proteínas (g)">
            {({ id }) => (
              <Input
                id={id}
                inputMode="decimal"
                value={v.p}
                onChange={(e) => setV({ ...v, p: e.target.value })}
              />
            )}
          </Field>
          <Field label="Carboidratos (g)">
            {({ id }) => (
              <Input
                id={id}
                inputMode="decimal"
                value={v.c}
                onChange={(e) => setV({ ...v, c: e.target.value })}
              />
            )}
          </Field>
          <Field label="Gorduras (g)">
            {({ id }) => (
              <Input
                id={id}
                inputMode="decimal"
                value={v.f}
                onChange={(e) => setV({ ...v, f: e.target.value })}
              />
            )}
          </Field>
        </div>
        <Button
          block
          disabled={!valid}
          onClick={() => {
            onAdd({
              key: draftKey(),
              refId: null,
              name: v.name.trim(),
              category: null,
              grams: num(v.grams),
              unit: "g",
              quantity: num(v.grams),
              kcal: num(v.kcal),
              protein_g: num(v.p),
              carbs_g: num(v.c),
              fat_g: num(v.f),
              fiber_g: null,
              nutrition_source: "Informado pelo usuário",
              source_consulted_at: new Date().toISOString().slice(0, 10),
              confidence: "informado",
              edited: false,
            });
            setV({ name: "", grams: "", kcal: "", p: "", c: "", f: "" });
          }}
        >
          Adicionar
        </Button>
      </div>
    </Sheet>
  );
}

export default function NewMealPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <NewMealInner />
    </Suspense>
  );
}
