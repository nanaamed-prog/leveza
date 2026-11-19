"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ACTIVITY_TYPES, INTENSITY_LABELS, metFor, type Intensity } from "@/lib/calc/met";
import { activityKcal } from "@/lib/calc/energy";
import { fromLocalInput, toLocalInput } from "@/lib/dates";
import type { ActivityEntry, Insert } from "@/lib/data/types";
import { fmtInt } from "@/lib/utils";

const schema = z
  .object({
    activity_type: z.string().min(1),
    custom_name: z.string().max(60).optional(),
    start: z.string().min(1, "Informe o início."),
    minutes: z.coerce
      .number<number>()
      .int()
      .min(1, "Mínimo 1 minuto.")
      .max(720, "Máximo 12 horas."),
    intensity: z.enum(["leve", "moderada", "vigorosa"]),
    perceived_effort: z
      .union([z.literal(""), z.coerce.number<number>().int().min(1).max(10)])
      .optional(),
    met: z.coerce.number<number>().min(1, "MET mínimo 1.").max(23, "MET máximo 23."),
    notes: z.string().max(300).optional(),
  })
  .refine((v) => v.activity_type !== "personalizada" || (v.custom_name ?? "").trim().length > 0, {
    path: ["custom_name"],
    message: "Dê um nome para a atividade.",
  });
type Values = z.input<typeof schema>;
type Parsed = z.output<typeof schema>;

export function ActivityPicker({
  tz,
  weightKg,
  factor,
  initial,
  initialType,
  onSubmit,
}: {
  initialType?: string;
  tz: string;
  weightKg: number | null;
  factor: number;
  initial?: ActivityEntry | null;
  onSubmit: (row: Insert<"activity_entries">) => Promise<void>;
}) {
  const [mountedAt] = useState(() => Date.now());
  const presetType =
    initialType && ACTIVITY_TYPES.some((a) => a.id === initialType) ? initialType : "caminhada";
  const { register, handleSubmit, setValue, control, formState } = useForm<Values, unknown, Parsed>(
    {
      resolver: zodResolver(schema),
      defaultValues: initial
        ? {
            activity_type: initial.activity_type,
            custom_name: initial.custom_name ?? "",
            start: toLocalInput(Date.parse(initial.started_at), tz),
            minutes: Math.round(
              (Date.parse(initial.ended_at) - Date.parse(initial.started_at)) / 60_000,
            ),
            intensity: initial.intensity,
            perceived_effort: initial.perceived_effort ?? "",
            met: initial.met,
            notes: initial.notes ?? "",
          }
        : {
            activity_type: presetType,
            start: toLocalInput(mountedAt - 30 * 60_000, tz),
            minutes: 30,
            intensity: "moderada",
            met: metFor(presetType, "moderada"),
            perceived_effort: "",
            notes: "",
          },
    },
  );
  const type = useWatch({ control, name: "activity_type" });
  const intensity = useWatch({ control, name: "intensity" }) as Intensity;
  const minutes = Number(useWatch({ control, name: "minutes" })) || 0;
  const met = Number(useWatch({ control, name: "met" })) || 0;

  useEffect(() => {
    if (!initial || type !== initial.activity_type || intensity !== initial.intensity)
      setValue("met", metFor(type, intensity));
  }, [type, intensity, setValue, initial]);

  const e = formState.errors;
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={handleSubmit(async (v) => {
        const start = fromLocalInput(v.start, tz);
        const end = start + v.minutes * 60_000;
        await onSubmit({
          activity_type: v.activity_type,
          custom_name: v.activity_type === "personalizada" ? (v.custom_name ?? "").trim() : null,
          started_at: new Date(start).toISOString(),
          ended_at: new Date(end).toISOString(),
          intensity: v.intensity,
          perceived_effort:
            v.perceived_effort === "" || v.perceived_effort === undefined
              ? null
              : v.perceived_effort,
          met: v.met,
          kcal_estimated: weightKg
            ? Math.round(activityKcal(v.met, weightKg, v.minutes, factor))
            : 0,
          notes: v.notes?.trim() || null,
        });
      })}
    >
      <Field label="Modalidade">
        {({ id }) => (
          <Select id={id} {...register("activity_type")}>
            {ACTIVITY_TYPES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {type === "personalizada" && (
        <Field label="Nome da atividade" error={e.custom_name?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("custom_name")}
            />
          )}
        </Field>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Início" error={e.start?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="datetime-local"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("start")}
            />
          )}
        </Field>
        <Field label="Duração (min)" error={e.minutes?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              inputMode="numeric"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("minutes")}
            />
          )}
        </Field>
        <Field label="Intensidade">
          {({ id }) => (
            <Select id={id} {...register("intensity")}>
              {(Object.keys(INTENSITY_LABELS) as Intensity[]).map((k) => (
                <option key={k} value={k}>
                  {INTENSITY_LABELS[k]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Esforço percebido (1–10)"
          error={e.perceived_effort ? "Use um valor de 1 a 10." : undefined}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              inputMode="numeric"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("perceived_effort")}
            />
          )}
        </Field>
      </div>
      <Field
        label="MET estimado"
        hint="Preenchido pelo catálogo; ajuste se souber um valor melhor."
        error={e.met?.message}
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            inputMode="decimal"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("met")}
          />
        )}
      </Field>
      <Field label="Notas (opcional)">
        {({ id }) => <Textarea id={id} {...register("notes")} />}
      </Field>
      <p className="tabular rounded-xl bg-sage-soft px-3 py-2 text-sm text-forest">
        {weightKg
          ? `≈ ${fmtInt(activityKcal(met, weightKg, minutes, factor))} kcal no período (estimativa; inclui o gasto de repouso desse tempo, que não é somado de novo no dia).`
          : "Registre seu peso para vermos a estimativa de gasto."}
      </p>
      <Button type="submit" block size="lg" disabled={formState.isSubmitting}>
        {initial ? "Salvar alterações" : "Registrar atividade"}
      </Button>
    </form>
  );
}
