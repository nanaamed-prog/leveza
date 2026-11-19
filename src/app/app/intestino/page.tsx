"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleAlert, Plus, Trash2, Waves } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Checkbox, ChoiceGroup, Field, Input, Textarea } from "@/components/ui/form";
import { ConfirmationDialog, Sheet } from "@/components/ui/dialog";
import { EmptyState } from "@/components/leveza/EmptyState";
import { LoadingSkeleton } from "@/components/leveza/LoadingSkeleton";
import { SimpleBarChart, CHART } from "@/components/leveza/charts";
import { useAppData, useRecords } from "@/lib/data/provider";
import { useNow } from "@/lib/useNow";
import {
  addDays,
  dayRange,
  formatDateShort,
  formatTime,
  fromLocalInput,
  localDateKey,
  toLocalInput,
} from "@/lib/dates";
import {
  BOWEL_TIPS,
  BOWEL_WARNING_SIGNS,
  BRISTOL,
  BRISTOL_GROUP_TEXT,
  bristolGroup,
  describeSince,
  gapNote,
  hoursSinceLast,
} from "@/lib/calc/bowel";
import type { BowelEntry } from "@/lib/data/types";
import { cn, todayKey } from "@/lib/utils";

function BowelForm({
  tz,
  onSave,
}: {
  tz: string;
  onSave: (r: Omit<BowelEntry, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
}) {
  const [mountedAt] = useState(() => Date.now());
  const [when, setWhen] = useState(() => toLocalInput(mountedAt, tz));
  const [bristol, setBristol] = useState<number | null>(null);
  const [effort, setEffort] = useState<"nenhum" | "algum" | "muito" | null>(null);
  const [discomfort, setDiscomfort] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const group = bristolGroup(bristol);
  return (
    <div className="space-y-4">
      <Field label="Quando?">
        {({ id }) => (
          <Input
            id={id}
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        )}
      </Field>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">
          Como estava? (escala de Bristol, opcional)
        </legend>
        <div className="space-y-1.5">
          {BRISTOL.map((b) => (
            <button
              key={b.type}
              type="button"
              aria-pressed={bristol === b.type}
              onClick={() => setBristol(bristol === b.type ? null : b.type)}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-[14px] border px-3 py-2 text-left text-sm",
                bristol === b.type
                  ? "border-forest bg-sage-soft text-forest"
                  : "border-line bg-card text-ink",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-canvas font-display font-bold">
                {b.type}
              </span>
              <span>
                {b.label}
                {b.hint && <span className="text-muted"> — {b.hint}</span>}
              </span>
            </button>
          ))}
        </div>
        {group && (
          <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-xs text-ink">
            {BRISTOL_GROUP_TEXT[group]}
          </p>
        )}
      </fieldset>
      <ChoiceGroup
        legend="Precisou fazer força?"
        columns={3}
        value={effort}
        onChange={setEffort}
        options={[
          { value: "nenhum", label: "Não" },
          { value: "algum", label: "Um pouco" },
          { value: "muito", label: "Muita" },
        ]}
      />
      <Checkbox checked={discomfort} onChange={setDiscomfort} label="Senti desconforto ou dor" />
      <Field label="Observações (opcional)">
        {({ id }) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>
      <Button
        block
        size="lg"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          await onSave({
            logged_at: new Date(fromLocalInput(when, tz)).toISOString(),
            bristol,
            effort,
            discomfort,
            notes: notes.trim() || null,
          });
          setSaving(false);
        }}
      >
        Salvar
      </Button>
    </div>
  );
}

function BowelInner() {
  const params = useSearchParams();
  const { tz, store, refresh } = useAppData();
  const now = useNow(60_000);
  const today = todayKey(tz);
  const from = dayRange(addDays(today, -29), tz).start;
  const list = useRecords("bowel_entries", { from: new Date(from).toISOString(), limit: 500 });
  const lastAny = useRecords("bowel_entries", { limit: 1 });
  const [open, setOpen] = useState(() => params.get("novo") === "1");
  const [toDelete, setToDelete] = useState<BowelEntry | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const since = hoursSinceLast(
    lastAny.data.map((b) => Date.parse(b.logged_at)),
    now,
  );
  const note = gapNote(since);
  const chart = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const k = addDays(today, i - 13);
        return {
          dia: formatDateShort(k),
          vezes: list.data.filter((b) => localDateKey(Date.parse(b.logged_at), tz) === k).length,
        };
      }),
    [list.data, today, tz],
  );
  const last7 = chart.slice(-7).reduce((s, c) => s + c.vezes, 0);
  const daysWith7 = chart.slice(-7).filter((c) => c.vezes > 0).length;

  async function quickLog() {
    if (!store) return;
    await store.insert("bowel_entries", {
      logged_at: new Date().toISOString(),
      bristol: null,
      effort: null,
      discomfort: false,
      notes: null,
    });
    setMsg("Registrado agora. Você pode detalhar depois, se quiser.");
    refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Meu intestino"
        subtitle="Acompanhar ajuda a perceber como alimentação, água e movimento influenciam seu bem-estar."
        back="/app"
        action={
          <Button size="icon" aria-label="Registrar com detalhes" onClick={() => setOpen(true)}>
            <Plus />
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="p-3">
          <p className="text-xs font-semibold text-muted">Último</p>
          <p className="font-display text-sm font-bold">{describeSince(since)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs font-semibold text-muted">Últimos 7 dias</p>
          <p className="tabular font-display text-lg font-bold">{last7}×</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs font-semibold text-muted">Dias com registro</p>
          <p className="tabular font-display text-lg font-bold">{daysWith7}/7</p>
        </Card>
      </div>

      <Button block size="lg" onClick={quickLog}>
        <Waves /> Fui ao banheiro agora
      </Button>
      {msg && (
        <p role="status" className="rounded-xl bg-sage-soft px-3 py-2 text-sm text-forest">
          {msg}
        </p>
      )}
      {note && (
        <p role="note" className="rounded-xl bg-orange-soft px-3 py-2 text-sm text-orange-ink">
          {note}
        </p>
      )}

      <Card>
        <CardTitle className="mb-2">Idas ao banheiro (14 dias)</CardTitle>
        {list.data.length > 0 ? (
          <SimpleBarChart
            data={chart}
            xKey="dia"
            bars={[{ key: "vezes", name: "Vezes", color: CHART.mineral }]}
            unit="vez(es)"
            integer
            title="Evacuações por dia"
            description={chart.map((c) => `${c.dia}: ${c.vezes}`).join("; ")}
          />
        ) : (
          <CardHint>Sem registros ainda.</CardHint>
        )}
        <CardHint className="mt-2">
          Não existe um número “certo”: em adultos, de cerca de 3 vezes por dia a 3 vezes por semana
          costuma ser considerado comum. O mais importante é o seu padrão e o conforto.
        </CardHint>
      </Card>

      <Card>
        <CardTitle>O que costuma ajudar</CardTitle>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {BOWEL_TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <CardHint className="mt-2">
          O intestino funcionando bem faz parte do bem-estar, mas não é medida de emagrecimento.
          Evite laxantes sem orientação profissional.
        </CardHint>
      </Card>

      <Card className="border-error/30">
        <CardTitle className="flex items-center gap-2 text-error">
          <CircleAlert className="size-5" aria-hidden /> Procure um profissional de saúde se houver
        </CardTitle>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {BOWEL_WARNING_SIGNS.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </Card>

      {list.loading ? null : list.data.length === 0 ? (
        <EmptyState
          icon={Waves}
          title="Nenhum registro nos últimos 30 dias"
          text="Um toque em “Fui ao banheiro agora” já basta. Detalhes são opcionais."
        />
      ) : (
        <ul className="space-y-2">
          {list.data.map((b) => (
            <li key={b.id}>
              <Card className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="tabular font-semibold">
                    {formatDateShort(localDateKey(Date.parse(b.logged_at), tz))} ·{" "}
                    {formatTime(Date.parse(b.logged_at), tz)}
                  </p>
                  <p className="text-xs text-muted">
                    {b.bristol ? `Tipo ${b.bristol}` : "Sem detalhes"}
                    {b.effort === "muito"
                      ? " · muita força"
                      : b.effort === "algum"
                        ? " · um pouco de força"
                        : ""}
                    {b.discomfort ? " · desconforto" : ""}
                    {b.notes ? ` · ${b.notes}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir registro"
                  className="text-error"
                  onClick={() => setToDelete(b)}
                >
                  <Trash2 />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open} onOpenChange={setOpen} title="Registrar ida ao banheiro">
        <BowelForm
          tz={tz}
          onSave={async (r) => {
            await store?.insert("bowel_entries", r);
            setOpen(false);
            setMsg("Registro salvo.");
            refresh();
          }}
        />
      </Sheet>
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir registro?"
        description="O registro será apagado."
        confirmLabel="Excluir"
        danger
        onConfirm={async () => {
          if (store && toDelete) await store.remove("bowel_entries", toDelete.id);
          refresh();
        }}
      />
    </div>
  );
}

export default function BowelPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <BowelInner />
    </Suspense>
  );
}
