"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { fromLocalInput, toLocalInput } from "@/lib/dates";
import type { Insert, WeightEntry } from "@/lib/data/types";

const schema = z.object({
  when: z.string().min(1, "Informe data e hora."),
  kg: z
    .string()
    .transform((s) => Number(s.replace(",", ".")))
    .pipe(
      z
        .number({ message: "Informe um número." })
        .min(25, "Valor muito baixo.")
        .max(400, "Valor muito alto."),
    ),
  conditions: z.string().max(120).optional(),
  notes: z.string().max(300).optional(),
});
type In = z.input<typeof schema>;
type Out = z.output<typeof schema>;

export function WeightForm({
  tz,
  initial,
  onSubmit,
}: {
  tz: string;
  initial?: WeightEntry | null;
  onSubmit: (r: Insert<"weight_entries">) => Promise<void>;
}) {
  const [mountedAt] = useState(() => Date.now());
  const { register, handleSubmit, formState } = useForm<In, unknown, Out>({
    resolver: zodResolver(schema),
    defaultValues: {
      when: toLocalInput(initial ? Date.parse(initial.measured_at) : mountedAt, tz),
      kg: initial ? String(initial.weight_kg).replace(".", ",") : "",
      conditions: initial?.conditions ?? "",
      notes: initial?.notes ?? "",
    },
  });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={handleSubmit((v) =>
        onSubmit({
          measured_at: new Date(fromLocalInput(v.when, tz)).toISOString(),
          weight_kg: v.kg,
          conditions: v.conditions?.trim() || null,
          notes: v.notes?.trim() || null,
        }),
      )}
    >
      <div className="grid grid-cols-2 gap-2">
        <Field label="Peso (kg)" error={e.kg?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              inputMode="decimal"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("kg")}
            />
          )}
        </Field>
        <Field label="Data e hora" error={e.when?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="datetime-local"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("when")}
            />
          )}
        </Field>
      </div>
      <Field
        label="Condições da medição (opcional)"
        hint="Ex.: ao acordar, após ir ao banheiro, mesma balança."
      >
        {({ id, describedBy }) => (
          <Input id={id} aria-describedby={describedBy} {...register("conditions")} />
        )}
      </Field>
      <Field label="Observações (opcional)">
        {({ id }) => <Input id={id} {...register("notes")} />}
      </Field>
      <Button type="submit" block size="lg" disabled={formState.isSubmitting}>
        {initial ? "Salvar alterações" : "Registrar peso"}
      </Button>
    </form>
  );
}
