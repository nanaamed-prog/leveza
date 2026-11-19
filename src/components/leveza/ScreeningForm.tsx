"use client";

import { useState } from "react";
import { ChoiceGroup, Field, Input, Textarea, Checkbox } from "@/components/ui/form";
import {
  CLINICAL_CONDITION_LABELS,
  type ClinicalCondition,
  type HealthScreening,
} from "@/lib/calc/eligibility";

export const EMPTY_SCREENING: HealthScreening = {
  birth_date: null,
  pregnant: null,
  breastfeeding: null,
  eating_disorder: null,
  diabetes: null,
  hypoglycemia_meds: null,
  clinical_conditions: [],
  physical_limitations: null,
  dietary_restrictions: null,
  consent_health_data: false,
};

/** Formulário da triagem de segurança (usado no onboarding e na revisão em Perfil). */
export function ScreeningForm({
  value,
  onChange,
}: {
  value: HealthScreening;
  onChange: (v: HealthScreening) => void;
}) {
  const set = <K extends keyof HealthScreening>(k: K, v: HealthScreening[K]) =>
    onChange({ ...value, [k]: v });
  const [birthTouched, setBirthTouched] = useState(false);
  const conds = value.clinical_conditions;

  const toggleCond = (c: ClinicalCondition | "nenhuma") => {
    if (c === "nenhuma")
      return set("clinical_conditions", conds.includes("nenhuma") ? [] : ["nenhuma"]);
    const without = conds.filter((x) => x !== "nenhuma" && x !== c);
    set("clinical_conditions", conds.includes(c) ? without : [...without, c]);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-sage-soft px-3 py-2 text-sm text-forest">
        Estas perguntas servem para mostrar só o que é seguro para você. Não fazemos diagnóstico.
        Perguntas sem resposta mantêm jejum e metas restritivas indisponíveis.
      </p>

      <Field
        label="Data de nascimento"
        error={birthTouched && !value.birth_date ? "Informe sua data de nascimento." : undefined}
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="date"
            max={today}
            min="1900-01-01"
            value={value.birth_date ?? ""}
            onBlur={() => setBirthTouched(true)}
            onChange={(e) => set("birth_date", e.target.value || null)}
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>

      <ChoiceGroup
        legend="Você está gestante?"
        columns={3}
        value={value.pregnant}
        onChange={(v) => set("pregnant", v)}
        options={[
          { value: "sim", label: "Sim" },
          { value: "nao", label: "Não" },
          { value: "nao_se_aplica", label: "Não se aplica" },
        ]}
      />

      <ChoiceGroup
        legend="Você está amamentando?"
        columns={3}
        value={value.breastfeeding}
        onChange={(v) => set("breastfeeding", v)}
        options={[
          { value: "sim", label: "Sim" },
          { value: "nao", label: "Não" },
          { value: "nao_se_aplica", label: "Não se aplica" },
        ]}
      />

      <ChoiceGroup
        legend="Você tem ou já teve algum transtorno alimentar?"
        hint="Por exemplo: anorexia, bulimia, compulsão alimentar."
        columns={2}
        value={value.eating_disorder}
        onChange={(v) => set("eating_disorder", v)}
        options={[
          { value: "nao", label: "Não" },
          { value: "atual", label: "Sim, atualmente" },
          { value: "previo", label: "Sim, no passado" },
          { value: "prefiro_nao_dizer", label: "Prefiro não dizer" },
        ]}
      />

      <ChoiceGroup
        legend="Você tem diabetes?"
        columns={3}
        value={value.diabetes}
        onChange={(v) => set("diabetes", v)}
        options={[
          { value: "nao", label: "Não" },
          { value: "tipo1", label: "Tipo 1" },
          { value: "tipo2", label: "Tipo 2" },
          { value: "outro", label: "Outro tipo" },
          { value: "nao_sei", label: "Não sei" },
        ]}
      />

      <ChoiceGroup
        legend="Usa medicamentos que podem causar hipoglicemia?"
        hint="Por exemplo: insulina ou alguns remédios para diabetes. Na dúvida, marque “Não sei”."
        columns={3}
        value={value.hypoglycemia_meds}
        onChange={(v) => set("hypoglycemia_meds", v)}
        options={[
          { value: "nao", label: "Não" },
          { value: "sim", label: "Sim" },
          { value: "nao_sei", label: "Não sei" },
        ]}
      />

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-ink">
          Alguma destas condições se aplica a você?
        </legend>
        <Checkbox
          checked={conds.includes("nenhuma")}
          onChange={() => toggleCond("nenhuma")}
          label="Nenhuma destas"
        />
        {(Object.keys(CLINICAL_CONDITION_LABELS) as ClinicalCondition[]).map((c) => (
          <Checkbox
            key={c}
            checked={conds.includes(c)}
            onChange={() => toggleCond(c)}
            label={CLINICAL_CONDITION_LABELS[c]}
          />
        ))}
      </fieldset>

      <Field
        label="Limitações físicas (opcional)"
        hint="Ex.: dor no joelho, restrição médica para impacto."
      >
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            value={value.physical_limitations ?? ""}
            onChange={(e) => set("physical_limitations", e.target.value || null)}
          />
        )}
      </Field>

      <Field
        label="Restrições ou preferências alimentares (opcional)"
        hint="Ex.: vegetariana, intolerância à lactose, alergia a amendoim."
      >
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            value={value.dietary_restrictions ?? ""}
            onChange={(e) => set("dietary_restrictions", e.target.value || null)}
          />
        )}
      </Field>
    </div>
  );
}
