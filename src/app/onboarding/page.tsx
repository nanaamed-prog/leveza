"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Checkbox, ChoiceGroup, Field, Input, Select, Textarea } from "@/components/ui/form";
import { ScreeningForm, EMPTY_SCREENING } from "@/components/leveza/ScreeningForm";
import { EligibilityNotice } from "@/components/leveza/EligibilityNotice";
import { useAppData } from "@/lib/data/provider";
import { evaluateEligibility, type HealthScreening } from "@/lib/calc/eligibility";
import { ACTIVITY_LEVEL_LABELS, type ActivityLevel } from "@/lib/calc/met";
import type { EquationParameter } from "@/lib/calc/bmr";
import { assessWeightGoal, type GoalType } from "@/lib/calc/weight";
import { CONSENT_VERSION } from "@/lib/data/types";
import { DEFAULT_TZ } from "@/lib/dates";
import { calculateBmi } from "@/lib/calc/bmi";

const STEPS = ["Consentimento", "Triagem", "Perfil", "Objetivo", "Pronto"] as const;

export default function Onboarding() {
  const router = useRouter();
  const { status, store, profile, refresh } = useAppData();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [consents, setConsents] = useState({
    terms: false,
    health: false,
    photos: false,
    training: false,
  });
  const [screening, setScreening] = useState<HealthScreening>(EMPTY_SCREENING);
  const [p, setP] = useState({
    name: "",
    height: "",
    weight: "",
    parameter: "nao_informado" as EquationParameter,
    activity: "leve" as ActivityLevel,
    sleep: "",
    tz: (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
      } catch {
        return DEFAULT_TZ;
      }
    })(),
  });
  const [goal, setGoal] = useState<{ type: GoalType; target: string }>({
    type: "habitos",
    target: "",
  });

  useEffect(() => {
    if (status === "signed_out") router.replace("/login");
    if (status === "ready" && profile?.onboarding_completed_at) router.replace("/app");
  }, [status, profile, router]);

  const heightN = Number(p.height.replace(",", "."));
  const weightN = Number(p.weight.replace(",", "."));
  const bmi = useMemo(() => {
    try {
      return heightN && weightN ? calculateBmi(weightN, heightN, 30).value : null;
    } catch {
      return null;
    }
  }, [heightN, weightN]);
  const elig = useMemo(
    () =>
      evaluateEligibility(
        { ...screening, consent_health_data: consents.health },
        { currentBmi: bmi },
      ),
    [screening, consents.health, bmi],
  );
  const targetN = goal.target ? Number(goal.target.replace(",", ".")) : null;
  const assessment =
    heightN && weightN
      ? assessWeightGoal({
          goal: goal.type,
          currentKg: weightN,
          targetKg: targetN,
          heightCm: heightN,
        })
      : null;

  function validate(): string | null {
    if (step === 0) {
      if (!consents.terms) return "Para continuar, aceite os termos e a política de privacidade.";
      if (!consents.health)
        return "O Leveza registra dados de saúde. Sem esse consentimento não conseguimos funcionar.";
    }
    if (step === 1) {
      if (!screening.birth_date) return "Informe sua data de nascimento.";
      if (elig.ageYears === null) return "Data de nascimento inválida.";
    }
    if (step === 2) {
      if (!p.name.trim()) return "Como podemos te chamar?";
      if (!(heightN >= 100 && heightN <= 250)) return "Informe a altura em centímetros (ex.: 165).";
      if (!(weightN >= 25 && weightN <= 400)) return "Informe o peso em kg (ex.: 68,5).";
    }
    if (step === 3) {
      if (goal.type === "perder" && !elig.weightLoss.allowed)
        return "Meta de perda de peso indisponível para o seu perfil.";
      if (
        (goal.type === "perder" || goal.type === "ganhar") &&
        targetN !== null &&
        !(targetN >= 25 && targetN <= 400)
      )
        return "Peso desejado inválido.";
      if (assessment?.level === "bloqueada")
        return "Escolha um peso desejado dentro de uma faixa segura ou outro objetivo.";
    }
    return null;
  }

  async function next() {
    const v = validate();
    setError(v);
    if (v) return;
    if (step < 3) return setStep(step + 1);
    if (step === 3) return save();
    router.replace("/app");
  }

  async function save() {
    if (!store) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await store.insertMany("consents", [
        { purpose: "termos_privacidade", version: CONSENT_VERSION, granted: consents.terms },
        { purpose: "dados_saude", version: CONSENT_VERSION, granted: consents.health },
        { purpose: "fotos_analise", version: CONSENT_VERSION, granted: consents.photos },
        { purpose: "fotos_treinamento", version: CONSENT_VERSION, granted: consents.training },
      ]);
      await store.insert("health_screenings", {
        ...screening,
        consent_health_data: consents.health,
        consent_version: CONSENT_VERSION,
      });
      await store.insert("weight_entries", {
        measured_at: now,
        weight_kg: weightN,
        notes: "Peso inicial",
        conditions: null,
      });
      await store.insert("goals", {
        type: goal.type,
        target_weight_kg: goal.type === "perder" || goal.type === "ganhar" ? targetN : null,
        kcal_target: null,
        weekly_rate_kg: null,
        status: "ativa",
      });
      await store.upsertSingle("user_preferences", {
        water_goal_ml: 2000,
        cup_sizes_ml: [200, 300, 500],
        photo_retention: "nao_guardar",
        remind_water: false,
        remind_fasting: false,
        plan52_goals: [],
      });
      await store.upsertSingle("profiles", {
        display_name: p.name.trim(),
        height_cm: heightN,
        timezone: p.tz,
        week_starts_on: 1,
        equation_parameter: p.parameter,
        activity_level: p.activity,
        sleep_routine: p.sleep || null,
        mode: elig.mode,
        onboarding_completed_at: null,
      });
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!store) return;
    const current = await store.getSingle("profiles");
    if (!current) return setError("Perfil não encontrado. Volte e salve novamente.");
    const { id: _id, user_id: _u, created_at: _c, updated_at: _up, ...rest } = current;
    void _id;
    void _u;
    void _c;
    void _up;
    await store.upsertSingle("profiles", {
      ...rest,
      onboarding_completed_at: new Date().toISOString(),
    });
    refresh();
    router.replace("/app");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
      <div className="flex items-center justify-between">
        <BrandLogo />
        <span className="text-xs font-semibold text-muted">
          {Math.min(step + 1, 5)} de {STEPS.length}
        </span>
      </div>
      <div className="mt-4 flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-forest" : "bg-line"}`}
          />
        ))}
      </div>
      <h1 className="mt-6 text-2xl font-bold">{STEPS[step]}</h1>

      <div className="mt-5 flex-1 space-y-4">
        {step === 0 && (
          <>
            <p className="text-sm text-ink">
              O Leveza é um diário de bem-estar. <strong>Não é dispositivo médico</strong> e não
              substitui acompanhamento profissional. As estimativas têm margem de erro.
            </p>
            <Checkbox
              checked={consents.terms}
              onChange={(v) => setConsents({ ...consents, terms: v })}
              label="Li e aceito os termos e a Política de Privacidade"
              description={
                <Link
                  href="/privacidade"
                  target="_blank"
                  className="font-semibold text-forest underline"
                >
                  Abrir política de privacidade
                </Link>
              }
            />
            <Checkbox
              checked={consents.health}
              onChange={(v) => setConsents({ ...consents, health: v })}
              label="Autorizo o tratamento dos meus dados de saúde (obrigatório)"
              description="Peso, refeições, sono, atividades e triagem — usados só para mostrar seus registros, estimativas e regras de segurança."
            />
            <Checkbox
              checked={consents.photos}
              onChange={(v) => setConsents({ ...consents, photos: v })}
              label="Autorizo a análise de fotos das refeições por IA (opcional)"
              description="A foto é enviada pelo servidor ao provedor de IA só para estimar alimentos. Por padrão, não é guardada."
            />
            <Checkbox
              checked={consents.training}
              onChange={(v) => setConsents({ ...consents, training: v })}
              label="Autorizo usar minhas fotos para melhorar modelos (opcional)"
              description="Separado e desligado por padrão. Você pode revogar quando quiser."
            />
          </>
        )}

        {step === 1 && <ScreeningForm value={screening} onChange={setScreening} />}

        {step === 2 && (
          <>
            <Field label="Como podemos te chamar?">
              {({ id }) => (
                <Input
                  id={id}
                  autoComplete="given-name"
                  value={p.name}
                  onChange={(e) => setP({ ...p, name: e.target.value })}
                />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Altura (cm)">
                {({ id }) => (
                  <Input
                    id={id}
                    inputMode="decimal"
                    placeholder="165"
                    value={p.height}
                    onChange={(e) => setP({ ...p, height: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Peso atual (kg)">
                {({ id }) => (
                  <Input
                    id={id}
                    inputMode="decimal"
                    placeholder="68,5"
                    value={p.weight}
                    onChange={(e) => setP({ ...p, weight: e.target.value })}
                  />
                )}
              </Field>
            </div>
            <ChoiceGroup
              legend="Parâmetro fisiológico para a equação de metabolismo"
              hint="A equação Mifflin–St Jeor foi criada com um parâmetro binário. Não inferimos nada pela sua aparência ou identidade. Se preferir não informar, mostramos uma faixa estimada."
              value={p.parameter}
              onChange={(v) => setP({ ...p, parameter: v })}
              options={[
                { value: "feminino", label: "Usar parâmetro feminino" },
                { value: "masculino", label: "Usar parâmetro masculino" },
                { value: "nao_informado", label: "Prefiro não informar (usar faixa)" },
              ]}
            />
            <Field
              label="Nível habitual de atividade"
              hint="Sem contar os exercícios que você vai registrar."
            >
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={p.activity}
                  onChange={(e) => setP({ ...p, activity: e.target.value as ActivityLevel })}
                >
                  {(Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]).map((k) => (
                    <option key={k} value={k}>
                      {ACTIVITY_LEVEL_LABELS[k]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field
              label="Rotina de sono (opcional)"
              hint="Ex.: durmo por volta das 23h e acordo às 6h30."
            >
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  value={p.sleep}
                  onChange={(e) => setP({ ...p, sleep: e.target.value })}
                />
              )}
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <ChoiceGroup
              legend="Qual é o seu objetivo agora?"
              value={goal.type}
              onChange={(v) => setGoal({ ...goal, type: v })}
              options={[
                { value: "habitos", label: "Acompanhar hábitos", description: "Sem foco em peso." },
                { value: "manter", label: "Manter o peso" },
                ...(elig.weightLoss.allowed
                  ? [
                      {
                        value: "perder" as const,
                        label: "Perder peso",
                        description: "Metas graduais e flexíveis.",
                      },
                    ]
                  : []),
                ...(elig.mode === "padrao"
                  ? [{ value: "ganhar" as const, label: "Ganhar peso" }]
                  : []),
              ]}
            />
            {!elig.weightLoss.allowed && (
              <EligibilityNotice
                title="Meta de perda de peso indisponível"
                reasons={elig.weightLoss.reasons}
                showScreeningLink={false}
              />
            )}
            {(goal.type === "perder" || goal.type === "ganhar") && (
              <Field
                label="Peso desejado (kg) — opcional"
                hint="É um objetivo seu, não um “peso ideal”. Você pode mudar quando quiser."
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    inputMode="decimal"
                    value={goal.target}
                    onChange={(e) => setGoal({ ...goal, target: e.target.value })}
                  />
                )}
              </Field>
            )}
            {assessment && assessment.messages.length > 0 && (
              <div
                role="alert"
                className={`rounded-card border p-3 text-sm ${assessment.level === "bloqueada" ? "border-error/30 bg-error-soft text-error" : "border-orange/40 bg-orange-soft text-orange-ink"}`}
              >
                {assessment.messages.map((m) => (
                  <p key={m}>{m}</p>
                ))}
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <p className="text-ink">
              Tudo pronto. Você pode revisar a triagem e os objetivos a qualquer momento em Perfil.
            </p>
            {elig.mode === "lactante" && (
              <EligibilityNotice
                title="Modo Lactante ativado"
                reasons={elig.fasting.reasons.slice(0, 1)}
                showScreeningLink={false}
              />
            )}
            {elig.mode !== "lactante" && !elig.fasting.allowed && (
              <EligibilityNotice
                title="Jejum indisponível para você"
                reasons={elig.fasting.reasons}
                showScreeningLink={false}
              />
            )}
            {elig.fasting.allowed && (
              <p className="rounded-xl bg-sage-soft px-3 py-2 text-forest">
                O módulo de jejum está disponível com os protocolos adequados ao seu perfil.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-error-soft px-3 py-2 text-sm font-semibold text-error"
        >
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-2">
        {step > 0 && step < 4 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            Voltar
          </Button>
        )}
        <Button block size="lg" onClick={step === 4 ? finish : next} disabled={saving}>
          {step === 3
            ? saving
              ? "Salvando…"
              : "Salvar e continuar"
            : step === 4
              ? "Ir para o início"
              : "Continuar"}
        </Button>
      </div>
    </main>
  );
}
