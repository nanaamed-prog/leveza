"use client";

import { useMemo, useState } from "react";
import { BookOpen, Plus, Star, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { ConfirmationDialog, Sheet } from "@/components/ui/dialog";
import { EmptyState } from "@/components/leveza/EmptyState";
import { useAppData, useRecords } from "@/lib/data/provider";
import { searchFoods, nutrientsFor, type FoodRef } from "@/lib/nutrition/foods";
import { SEED_CONSULTED_AT } from "@/lib/nutrition/foods";
import { fmt1, fmtInt } from "@/lib/utils";
import type { Recipe } from "@/lib/data/types";

interface Ing {
  ref: FoodRef;
  grams: number;
}

export default function RecipesPage() {
  const { store, refresh } = useAppData();
  const recipes = useRecords("recipes", { limit: 200 });
  const items = useRecords("recipe_items", {
    in: { field: "recipe_id", values: recipes.data.map((r) => r.id) },
  });
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Recipe | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [f, setF] = useState({
    name: "",
    servings: "2",
    allergens: "",
    substitutions: "",
    notes: "",
  });
  const [ings, setIngs] = useState<Ing[]>([]);
  const [q, setQ] = useState("");
  const results = useMemo(() => (q ? searchFoods(q, 6) : []), [q]);

  const totals = (recipeId: string) => {
    const its = items.data.filter((i) => i.recipe_id === recipeId);
    return its.reduce(
      (t, i) => ({
        kcal: t.kcal + i.kcal,
        p: t.p + i.protein_g,
        c: t.c + i.carbs_g,
        g: t.g + i.fat_g,
      }),
      { kcal: 0, p: 0, c: 0, g: 0 },
    );
  };

  async function saveRecipe() {
    if (!store) return;
    const servings = Math.max(1, Math.round(Number(f.servings) || 1));
    if (!f.name.trim() || ings.length === 0) return setMsg("Dê um nome e adicione ingredientes.");
    const r = await store.insert("recipes", {
      name: f.name.trim(),
      servings,
      allergens: f.allergens || null,
      substitutions: f.substitutions || null,
      notes: f.notes || null,
      favorite: false,
    });
    await store.insertMany(
      "recipe_items",
      ings.map((i) => {
        const n = nutrientsFor(i.ref, i.grams);
        return {
          recipe_id: r.id,
          name: i.ref.name,
          grams: i.grams,
          kcal: n.kcal,
          protein_g: n.protein_g,
          carbs_g: n.carbs_g,
          fat_g: n.fat_g,
        };
      }),
    );
    setOpen(false);
    setF({ name: "", servings: "2", allergens: "", substitutions: "", notes: "" });
    setIngs([]);
    setMsg(null);
    refresh();
  }

  async function logPortion(r: Recipe) {
    if (!store) return;
    const t = totals(r.id);
    const k = 1 / r.servings;
    const e = await store.insert("food_entries", {
      eaten_at: new Date().toISOString(),
      meal: "almoco",
      photo_path: null,
      source: "receita",
      total_kcal: Math.round(t.kcal * k),
      notes: r.name,
    });
    await store.insert("food_items", {
      food_entry_id: e.id,
      name: `${r.name} (1 porção)`,
      category: "preparacoes",
      quantity: 1,
      unit: "unidade",
      grams: items.data.filter((i) => i.recipe_id === r.id).reduce((s, i) => s + i.grams, 0) * k,
      kcal: t.kcal * k,
      protein_g: t.p * k,
      carbs_g: t.c * k,
      fat_g: t.g * k,
      fiber_g: null,
      nutrition_source: "Receita (soma dos ingredientes)",
      source_consulted_at: SEED_CONSULTED_AT,
      confidence: "informado",
      edited: false,
    });
    setMsg(
      `1 porção de “${r.name}” registrada agora (ajuste a refeição em Alimentação, se precisar).`,
    );
    refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Receitas"
        back="/app/perfil"
        action={
          <Button size="icon" aria-label="Nova receita" onClick={() => setOpen(true)}>
            <Plus />
          </Button>
        }
      />
      {msg && !open && (
        <p role="status" className="rounded-xl bg-sage-soft px-3 py-2 text-sm text-forest">
          {msg}
        </p>
      )}
      {recipes.loading ? null : recipes.data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma receita ainda"
          text="Guarde suas preparações para registrar porções com um toque."
          action={<Button onClick={() => setOpen(true)}>Criar receita</Button>}
        />
      ) : (
        recipes.data.map((r) => {
          const t = totals(r.id);
          return (
            <Card key={r.id} className="space-y-2">
              <div className="flex items-start gap-2">
                <CardTitle className="flex-1">{r.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={r.favorite ? "Remover dos favoritos" : "Favoritar"}
                  aria-pressed={r.favorite}
                  onClick={async () => {
                    await store?.update("recipes", r.id, { favorite: !r.favorite });
                    refresh();
                  }}
                >
                  <Star className={r.favorite ? "fill-orange text-orange" : ""} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir receita"
                  className="text-error"
                  onClick={() => setToDelete(r)}
                >
                  <Trash2 />
                </Button>
              </div>
              <p className="tabular text-sm text-muted">
                {r.servings} porções · por porção ≈ {fmtInt(t.kcal / r.servings)} kcal · P{" "}
                {fmt1(t.p / r.servings)} g · C {fmt1(t.c / r.servings)} g · G{" "}
                {fmt1(t.g / r.servings)} g
              </p>
              <ul className="text-sm">
                {items.data
                  .filter((i) => i.recipe_id === r.id)
                  .map((i) => (
                    <li key={i.id}>
                      • {i.name} — {fmtInt(i.grams)} g
                    </li>
                  ))}
              </ul>
              {r.allergens && (
                <p className="text-sm">
                  <strong>Alergênicos:</strong> {r.allergens}
                </p>
              )}
              {r.substitutions && (
                <p className="text-sm">
                  <strong>Substituições:</strong> {r.substitutions}
                </p>
              )}
              <Button variant="secondary" size="sm" onClick={() => logPortion(r)}>
                Registrar 1 porção agora
              </Button>
            </Card>
          );
        })
      )}

      <Sheet open={open} onOpenChange={setOpen} title="Nova receita">
        <div className="space-y-3">
          <Field label="Nome">
            {({ id }) => (
              <Input
                id={id}
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            )}
          </Field>
          <Field label="Rende quantas porções?">
            {({ id }) => (
              <Input
                id={id}
                inputMode="numeric"
                value={f.servings}
                onChange={(e) => setF({ ...f, servings: e.target.value })}
              />
            )}
          </Field>
          <Field label="Adicionar ingrediente">
            {({ id }) => (
              <Input
                id={id}
                type="search"
                placeholder="Buscar…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            )}
          </Field>
          {results.length > 0 && (
            <ul className="divide-y divide-line rounded-xl border border-line bg-card">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="min-h-11 w-full px-3 text-left text-sm"
                    onClick={() => {
                      setIngs([...ings, { ref: r, grams: r.portions[0]?.grams ?? 100 }]);
                      setQ("");
                    }}
                  >
                    + {r.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {ings.map((i, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="flex-1 text-sm">{i.ref.name}</span>
              <Input
                aria-label={`Gramas de ${i.ref.name}`}
                className="w-24"
                inputMode="decimal"
                value={String(i.grams)}
                onChange={(e) => {
                  const g = Number(e.target.value.replace(",", ".")) || 0;
                  setIngs(ings.map((x, j) => (j === idx ? { ...x, grams: g } : x)));
                }}
              />
              <span className="text-xs text-muted">g</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remover"
                onClick={() => setIngs(ings.filter((_, j) => j !== idx))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Field label="Alergênicos (opcional)" hint="Ex.: glúten, lactose, ovo, amendoim.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={f.allergens}
                onChange={(e) => setF({ ...f, allergens: e.target.value })}
              />
            )}
          </Field>
          <Field label="Substituições (opcional)">
            {({ id }) => (
              <Textarea
                id={id}
                value={f.substitutions}
                onChange={(e) => setF({ ...f, substitutions: e.target.value })}
              />
            )}
          </Field>
          <CardHint>Valores estimados pela soma dos ingredientes crus/cozidos informados.</CardHint>
          {msg && (
            <p role="alert" className="text-sm font-semibold text-error">
              {msg}
            </p>
          )}
          <Button block onClick={saveRecipe}>
            Salvar receita
          </Button>
        </div>
      </Sheet>
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir receita?"
        description="A receita e seus ingredientes serão apagados."
        confirmLabel="Excluir"
        danger
        onConfirm={async () => {
          if (store && toDelete) await store.remove("recipes", toDelete.id);
          refresh();
        }}
      />
    </div>
  );
}
