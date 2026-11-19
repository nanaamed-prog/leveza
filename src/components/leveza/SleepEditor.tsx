"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { fromLocalInput, toLocalInput, formatDuration } from "@/lib/dates";
import { effectiveSleepMinutes, validateSleep } from "@/lib/calc/sleep";
import type { Insert, SleepEntry } from "@/lib/data/types";

function Scale5({
  label,
  value,
  onChange,
  low,
  high,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  low: string;
  high: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold text-ink">{label}</legend>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? null : n)}
            className={`min-h-11 flex-1 rounded-[12px] border text-sm font-semibold ${value === n ? "border-forest bg-forest text-white" : "border-line bg-card text-ink"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[0.7rem] text-muted">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

export function SleepEditor({
  tz,
  initial,
  onSubmit,
}: {
  tz: string;
  initial?: SleepEntry | null;
  onSubmit: (r: Insert<"sleep_entries">) => Promise<void>;
}) {
  const defBed = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(23, 0, 0, 0);
    return d.getTime();
  })();
  const [v, setV] = useState({
    bed: initial ? toLocalInput(Date.parse(initial.started_at), tz) : toLocalInput(defBed, tz),
    wake: initial
      ? toLocalInput(Date.parse(initial.ended_at), tz)
      : toLocalInput(defBed + 7.5 * 3_600_000, tz),
    awake: String(initial?.awake_minutes ?? 0),
    awakenings: initial?.awakenings != null ? String(initial.awakenings) : "",
    quality: initial?.quality ?? null,
    hunger: initial?.hunger_level ?? null,
    energy: initial?.energy_level ?? null,
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const start = v.bed ? fromLocalInput(v.bed, tz) : NaN;
  const end = v.wake ? fromLocalInput(v.wake, tz) : NaN;
  const awake = Math.max(0, Number(v.awake) || 0);
  const rec = { start, end, awakeMinutes: awake };
  const problem =
    Number.isFinite(start) && Number.isFinite(end) ? validateSleep(rec) : "Preencha os horários.";

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (problem) return setError(problem);
        setSaving(true);
        try {
          await onSubmit({
            started_at: new Date(start).toISOString(),
            ended_at: new Date(end).toISOString(),
            awake_minutes: awake,
            awakenings: v.awakenings === "" ? null : Math.max(0, Math.round(Number(v.awakenings))),
            quality: v.quality,
            hunger_level: v.hunger,
            energy_level: v.energy,
            notes: v.notes.trim() || null,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não foi possível salvar.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <Field label="Deitou">
          {({ id }) => (
            <Input
              id={id}
              type="datetime-local"
              value={v.bed}
              onChange={(e) => setV({ ...v, bed: e.target.value })}
            />
          )}
        </Field>
        <Field label="Acordou">
          {({ id }) => (
            <Input
              id={id}
              type="datetime-local"
              value={v.wake}
              onChange={(e) => setV({ ...v, wake: e.target.value })}
            />
          )}
        </Field>
        <Field label="Tempo acordado à noite (min)">
          {({ id }) => (
            <Input
              id={id}
              inputMode="numeric"
              value={v.awake}
              onChange={(e) => setV({ ...v, awake: e.target.value })}
            />
          )}
        </Field>
        <Field label="Despertares">
          {({ id }) => (
            <Input
              id={id}
              inputMode="numeric"
              value={v.awakenings}
              onChange={(e) => setV({ ...v, awakenings: e.target.value })}
            />
          )}
        </Field>
      </div>
      <p
        className="tabular rounded-xl bg-sage-soft px-3 py-2 text-sm text-forest"
        aria-live="polite"
      >
        {problem ?? `Duração efetiva: ${formatDuration(effectiveSleepMinutes(rec))}`}
      </p>
      <Scale5
        label="Qualidade do sono"
        value={v.quality}
        onChange={(q) => setV({ ...v, quality: q })}
        low="Muito ruim"
        high="Muito boa"
      />
      <Scale5
        label="Disposição ao acordar"
        value={v.energy}
        onChange={(q) => setV({ ...v, energy: q })}
        low="Baixa"
        high="Alta"
      />
      <Scale5
        label="Fome ao longo do dia"
        value={v.hunger}
        onChange={(q) => setV({ ...v, hunger: q })}
        low="Pouca"
        high="Muita"
      />
      <Field label="Notas (opcional)">
        {({ id }) => (
          <Textarea
            id={id}
            value={v.notes}
            onChange={(e) => setV({ ...v, notes: e.target.value })}
          />
        )}
      </Field>
      {error && (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
      <Button type="submit" block size="lg" disabled={saving}>
        {initial ? "Salvar alterações" : "Registrar sono"}
      </Button>
    </form>
  );
}
