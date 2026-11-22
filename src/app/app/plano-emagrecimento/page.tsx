"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Baby,
  CircleAlert,
  Gauge,
  Info,
  Pause,
  Play,
  Save,
  Scale,
  ShieldCheck,
  Target,
  Timer,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { EligibilityNotice } from "@/components/leveza/EligibilityNotice";
import { BreastfeedingPatternPicker } from "@/components/leveza/BreastfeedingPatternPicker";
import { LoadingSkeleton } from "@/components/leveza/LoadingSkeleton";
import {
  EtaHistoryChart,
  IntakeVsExpenditureChart,
  ProjectionChart,
  ScenarioCompareChart,
  WeeklyBalanceChart,
  type ProjectionRow,
} from "@/components/leveza/PlanCharts";
import { useAppData, useRecords } from "@/lib/data/provider";
import { useDailyReport } from "@/lib/data/useDailyReport";
import { usePersonalBasics } from "@/lib/data/useDaySummary";
import { addDays, dayRange, formatDateShort, localDateKey } from "@/lib/dates";
import { fmt1, fmtInt, todayKey } from "@/lib/utils";
import {
  etaHistory,
  etaRange,
  evaluatePlanSafety,
  formatWeeksRange,
  INTENSITY_LABEL,
  MAX_WEEKS,
  observedEta,
  observedTrend,
  planAccess,
  predictionConfidence,
  projectionAt,
  RED_FLAG_SYMPTOMS,
  SCENARIOS,
  simulatePlan,
  type BreastfeedingPattern,
  type ExerciseIntensity,
  type PlanInput,
  type RedFlag,
  type ScenarioKey,
  type SimulationResult,
} from "@/lib/calc/weightPlan";
import type { WeightPlan, WeightPlanStatus } from "@/lib/data/types";

const CONF_LABEL = { baixa: "Baixa", moderada: "Moderada", boa: "Boa" } as const;

export default function WeightPlanPage() {
  const { profile, goal, latestWeight, eligibility, screening } = useAppData();
  const basics = usePersonalBasics();
  const report = useDailyReport(56);
  const weights = useRecords("weight_entries", { order: "asc", limit: 5000 });
  const plans = useRecords("weight_plans", { limit: 20 });

  const access = planAccess(eligibility);
  const lactante = access === "informativo_lactante";

  // Só mostra o carregamento na primeira vez: ao salvar, os dados recarregam sem desmontar a tela.
  const [loadedOnce, setLoadedOnce] = useState(false);
  const loading = report.loading || weights.loading || plans.loading;
  if (!loading && !loadedOnce) setLoadedOnce(true);
  if (loading && !loadedOnce) return <LoadingSkeleton />;

  const missing: string[] = [];
  if (!latestWeight) missing.push("peso atual");
  if (!profile?.height_cm) missing.push("altura");
  if (basics.age === null) missing.push("data de nascimento (na triagem)");

  return (
    <div className="space-y-4">
      <PageHeader title="Plano de Emagrecimento" back="/app" />
      {lactante && (
        <div className="flex items-center gap-2 rounded-full bg-sage-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-forest">
          <Baby className="size-4" aria-hidden /> Modo Lactante — projeções apenas informativas
        </div>
      )}

      {access === "bloqueado" ? (
        <EligibilityNotice
          title="Plano de emagrecimento indisponível para você"
          reasons={eligibility.weightLoss.reasons}
        />
      ) : missing.length > 0 ? (
        <Card>
          <CardTitle>Faltam alguns dados</CardTitle>
          <CardHint className="mt-1">Para simular, precisamos de: {missing.join(", ")}.</CardHint>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/app/evolucao">Registrar peso</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/perfil">Completar perfil</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <PlanInner
          key={`${latestWeight!.id}-${goal?.id ?? ""}-${screening?.id ?? ""}`}
          lactante={lactante}
          rows={report.rows}
          weightRows={weights.data.map((w) => ({
            date: w.measured_at,
            kg: Number(w.weight_kg),
          }))}
          openPlan={plans.data.find((p) => p.status !== "encerrado") ?? null}
        />
      )}
      <Education lactante={lactante} />
    </div>
  );
}

function PlanInner({
  lactante,
  rows,
  weightRows,
  openPlan,
}: {
  lactante: boolean;
  rows: ReturnType<typeof useDailyReport>["rows"];
  weightRows: { date: string; kg: number }[];
  openPlan: WeightPlan | null;
}) {
  const { profile, goal, latestWeight, eligibility, store, refresh, tz } = useAppData();
  const basics = usePersonalBasics();
  const today = todayKey(tz);
  const startKg = Number(latestWeight!.weight_kg);

  // Registros de bem-estar dos últimos 7 dias (sinais de alerta)
  const from7 = new Date(dayRange(addDays(today, -6), tz).start).toISOString();
  const wellbeing = useRecords("wellbeing_entries", { from: from7, limit: 200 });
  const recentRedFlags = useMemo(() => {
    const set = new Set<RedFlag>();
    for (const w of wellbeing.data)
      for (const k of (w.symptoms ?? "").split(",").map((x) => x.trim()))
        if (k in RED_FLAG_SYMPTOMS) set.add(k as RedFlag);
    return [...set];
  }, [wellbeing.data]);

  const withMeals = rows.filter((r) => r.consumed > 0);
  const last14 = withMeals.filter((r) => r.date >= addDays(today, -13));
  const avgIntake = last14.length
    ? last14.reduce((s, r) => s + r.consumed, 0) / last14.length
    : null;
  const sleepRows = rows.filter((r) => r.sleepMin !== null);
  const sleepHours = sleepRows.length
    ? sleepRows.reduce((s, r) => s + (r.sleepMin ?? 0), 0) / sleepRows.length / 60
    : 8;

  const [target, setTarget] = useState(() =>
    String(openPlan?.target_weight_kg ?? goal?.target_weight_kg ?? Math.round(startKg - 5)),
  );
  const [intake, setIntake] = useState(
    () => Math.round((openPlan?.intake_kcal ?? goal?.kcal_target ?? avgIntake ?? 1800) / 50) * 50,
  );
  const [days, setDays] = useState(openPlan?.exercise_days ?? SCENARIOS.moderada.daysPerWeek);
  const [minutes, setMinutes] = useState(openPlan?.exercise_minutes ?? SCENARIOS.moderada.minutes);
  const [intensity, setIntensity] = useState<ExerciseIntensity>(
    openPlan?.exercise_intensity ?? SCENARIOS.moderada.intensity,
  );
  const [scenario, setScenario] = useState<ScenarioKey | "personalizado">(
    openPlan?.scenario ?? "moderada",
  );
  const pattern: BreastfeedingPattern = profile?.breastfeeding_pattern ?? "nao_informado";
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const targetKg = Number(String(target).replace(",", "."));
  const targetValid = targetKg > 25 && targetKg < startKg;

  const common = (ex: PlanInput["exercise"], kcal = intake): PlanInput => ({
    startKg,
    targetKg: targetValid ? targetKg : startKg - 1,
    heightCm: Number(profile!.height_cm),
    ageYears: basics.age!,
    parameter: profile?.equation_parameter ?? "nao_informado",
    activityLevel: profile?.activity_level ?? "leve",
    sleepHours,
    intakeKcal: kcal,
    exercise: ex,
    lactation: lactante ? pattern : null,
  });

  const input = common({ daysPerWeek: days, minutes, intensity });
  const result = simulatePlan(input);
  const safety = evaluatePlanSafety({ eligibility, input, result, recentRedFlags });
  const eta = etaRange(result);

  const scenarios = (Object.keys(SCENARIOS) as ScenarioKey[]).map((k) => {
    const s = SCENARIOS[k];
    const inp = common({ daysPerWeek: s.daysPerWeek, minutes: s.minutes, intensity: s.intensity });
    const r = simulatePlan(inp);
    return { key: k, s, r, eta: etaRange(r) };
  });

  // Observado e confiança
  const points = weightRows.map((w) => ({ date: localDateKey(Date.parse(w.date), tz), kg: w.kg }));
  const trend = observedTrend(points, today);
  const obsEta = trend ? observedEta(startKg, input.targetKg, trend.kgPerWeek) : null;
  const weighIns28 = points.filter((p) => p.date >= addDays(today, -27)).length;
  const confidence = predictionConfidence({
    weighInsLast28: weighIns28,
    foodDaysLast14: last14.length,
    parameterInformed: input.parameter !== "nao_informado",
    lactante,
  });

  const projection = buildProjectionRows(points, result, today);
  const history = etaHistory(points, input.targetKg, today, 10).map((h) => ({
    semana: formatDateShort(h.date),
    semanas: h.weeks,
  }));
  const weekly = buildWeekly(rows, today);
  const daily14 = rows
    .filter((r) => r.date >= addDays(today, -13))
    .map((r) => ({
      dia: formatDateShort(r.date),
      ingestao: r.consumed > 0 ? r.consumed : null,
      gasto: r.expenditure,
    }));

  const canShow = safety.canSimulate;

  async function savePlan() {
    if (!store || !safety.canSave || !targetValid) return;
    setErr(null);
    try {
      if (openPlan) await store.update("weight_plans", openPlan.id, { status: "encerrado" });
      await store.insert("weight_plans", {
        start_weight_kg: Math.round(startKg * 10) / 10,
        target_weight_kg: Math.round(targetKg * 10) / 10,
        intake_kcal: Math.round(intake),
        exercise_days: days,
        exercise_minutes: minutes,
        exercise_intensity: intensity,
        scenario,
        eta_weeks_min: eta ? Math.min(eta.min, MAX_WEEKS) : null,
        eta_weeks_max: eta ? Math.min(eta.max, MAX_WEEKS) : null,
        status: "ativo",
      });
      setMsg(
        "Plano salvo. Ele é recalculado sempre que você registra peso, refeições e atividades.",
      );
      refresh();
    } catch (e) {
      setErr(
        e instanceof Error && /plan_not_allowed/.test(e.message)
          ? "Seu perfil de triagem não permite salvar um plano de emagrecimento."
          : "Não foi possível salvar agora. Tente novamente.",
      );
    }
  }

  async function setStatus(status: WeightPlanStatus) {
    if (!store || !openPlan) return;
    try {
      await store.update("weight_plans", openPlan.id, { status });
      setMsg(
        status === "pausado"
          ? "Plano pausado, sem nenhuma penalidade. Retome quando quiser."
          : status === "manutencao"
            ? "Modo manutenção ativo: o foco agora é manter o peso."
            : status === "ativo"
              ? "Plano retomado."
              : "Plano encerrado.",
      );
      refresh();
    } catch {
      setErr("Não foi possível alterar o plano agora.");
    }
  }

  const applyScenario = (k: ScenarioKey) => {
    const s = SCENARIOS[k];
    setScenario(k);
    setDays(s.daysPerWeek);
    setMinutes(s.minutes);
    setIntensity(s.intensity);
  };

  return (
    <>
      {/* Peso atual e desejado */}
      <Card className="p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted">Peso atual</p>
            <p className="tabular font-display text-2xl font-bold">{fmt1(startKg)} kg</p>
          </div>
          <Target className="mb-2 size-5 text-orange" aria-hidden />
          <div className="w-28">
            <Field label="Peso desejado (kg)">
              {({ id }) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="text-right font-display font-bold"
                />
              )}
            </Field>
          </div>
        </div>
        {!targetValid && (
          <p role="alert" className="mt-2 text-sm text-error">
            Informe um peso desejado menor que o atual.
          </p>
        )}
        {trend && (
          <p className="tabular mt-2 text-xs text-muted">
            Ritmo observado nas últimas semanas: {trend.kgPerWeek > 0 ? "+" : ""}
            {fmt1(trend.kgPerWeek)} kg/semana (média móvel de 7 dias)
            {obsEta !== null ? ` · nesse ritmo, cerca de ${obsEta} semanas até a meta` : ""}.
          </p>
        )}
        {openPlan && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <Badge tone={openPlan.status === "ativo" ? "forest" : "neutral"}>
              Plano {openPlan.status === "manutencao" ? "em manutenção" : openPlan.status}
            </Badge>
            {openPlan.status === "ativo" ? (
              <Button variant="ghost" size="sm" onClick={() => setStatus("pausado")}>
                <Pause /> Pausar
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setStatus("ativo")}>
                <Play /> Retomar
              </Button>
            )}
            {openPlan.status !== "manutencao" && (
              <Button variant="ghost" size="sm" onClick={() => setStatus("manutencao")}>
                <Scale /> Manutenção
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(true)}>
              Encerrar
            </Button>
          </div>
        )}
      </Card>

      {lactante && (
        <Card className="space-y-2 p-4">
          <CardTitle className="text-base">Como está a amamentação?</CardTitle>
          <CardHint>
            Amamentar gasta energia, e isso entra no seu gasto estimado. Quanto varia muito de
            pessoa para pessoa, então também alarga a faixa de incerteza. Não vira meta de ingestão.
          </CardHint>
          <BreastfeedingPatternPicker />
        </Card>
      )}

      <WellbeingCheckin lactante={lactante} />

      {!canShow ? (
        <EligibilityNotice
          title="Recomendações de perda de peso pausadas"
          reasons={safety.blocks}
          showScreeningLink={false}
        />
      ) : (
        <>
          {/* Três cenários */}
          <section aria-label="Comparador de atividades" className="space-y-2">
            <h2 className="px-1 font-display text-base font-bold">Compare cenários de atividade</h2>
            <p className="px-1 text-xs text-muted">
              Mesma ingestão ({fmtInt(intake)} kcal/dia), muda só a atividade. Toque para usar no
              simulador.
            </p>
            <div className="grid gap-2">
              {scenarios.map(({ key, s, r, eta: e }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyScenario(key)}
                  aria-pressed={scenario === key}
                  className={`rounded-card border bg-card p-3 text-left shadow-card ${scenario === key ? "border-forest ring-2 ring-forest/20" : "border-line"}`}
                >
                  <span className="block font-display font-bold text-ink">{s.label}</span>
                  <span className="block text-xs text-muted">{s.text}</span>
                  <ScenarioFacts r={r} eta={e} intake={intake} conf={confidence.level} />
                </button>
              ))}
            </div>
            <ScenarioCompareChart
              data={scenarios
                .filter((x) => x.eta)
                .map((x) => ({
                  nome: x.s.label,
                  semanas: x.eta!.central,
                  erro: [
                    x.eta!.central - x.eta!.min,
                    Math.min(x.eta!.max, MAX_WEEKS) - x.eta!.central,
                  ],
                }))}
              description={scenarios
                .map((x) => `${x.s.label}: ${formatWeeksRange(x.eta)}`)
                .join("; ")}
            />
          </section>

          {/* Simulador */}
          <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Simulador</CardTitle>
              <Badge tone="orange">Simulação</Badge>
            </div>
            <Slider
              label="Ingestão por dia"
              value={intake}
              min={1000}
              max={3500}
              step={50}
              unit="kcal"
              onChange={(v) => {
                setIntake(v);
              }}
            />
            {avgIntake !== null && (
              <p className="tabular -mt-2 text-xs text-muted">
                Sua média registrada nos últimos 14 dias: {fmtInt(avgIntake)} kcal/dia.
              </p>
            )}
            <Slider
              label="Dias de exercício por semana"
              value={days}
              min={0}
              max={7}
              step={1}
              unit="dias"
              onChange={(v) => {
                setDays(v);
                setScenario("personalizado");
              }}
            />
            <Slider
              label="Duração de cada sessão"
              value={minutes}
              min={0}
              max={120}
              step={5}
              unit="min"
              onChange={(v) => {
                setMinutes(v);
                setScenario("personalizado");
              }}
            />
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">Intensidade</p>
              <div role="radiogroup" aria-label="Intensidade" className="grid grid-cols-3 gap-2">
                {(Object.keys(INTENSITY_LABEL) as ExerciseIntensity[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={intensity === k}
                    onClick={() => {
                      setIntensity(k);
                      setScenario("personalizado");
                    }}
                    className={`min-h-11 rounded-xl border text-sm font-semibold ${intensity === k ? "border-forest bg-forest text-white" : "border-line bg-card text-ink"}`}
                  >
                    {INTENSITY_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-canvas p-3">
              <p className="text-xs text-muted">Tempo estimado até a meta</p>
              <p className="font-display text-xl font-bold text-forest">
                {targetValid ? formatWeeksRange(eta) : "—"}
              </p>
              <ScenarioFacts r={result} eta={eta} intake={intake} conf={confidence.level} compact />
              <div className="mt-2 grid grid-cols-4 gap-1 text-center">
                {[4, 8, 12, 24].map((w) => {
                  const p = projectionAt(result, w);
                  return (
                    <div key={w} className="rounded-lg bg-card p-1.5">
                      <p className="text-[0.65rem] text-muted">{w} sem.</p>
                      <p className="tabular text-sm font-bold">{fmt1(p.central)}</p>
                      <p className="tabular text-[0.6rem] text-muted">
                        {fmt1(p.low)}–{fmt1(p.high)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {safety.blocks.length > 0 && (
              <div
                role="alert"
                className="space-y-1 rounded-xl bg-orange-soft p-3 text-sm text-ink"
              >
                <p className="flex items-center gap-2 font-semibold text-orange-ink">
                  <CircleAlert className="size-4" aria-hidden />
                  {lactante ? "Somente informação" : "Esta simulação não pode virar plano"}
                </p>
                {safety.blocks.map((b) => (
                  <p key={b}>{b}</p>
                ))}
              </div>
            )}
            {safety.warnings.length > 0 && (
              <ul className="space-y-1 text-xs text-muted">
                {safety.warnings.map((w) => (
                  <li key={w} className="flex gap-1.5">
                    <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {w}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-start gap-2 rounded-xl border border-line p-3 text-xs text-muted">
              <Gauge className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden />
              <span>
                Confiança da previsão:{" "}
                <strong className="text-ink">{CONF_LABEL[confidence.level]}</strong>.{" "}
                {confidence.reasons.join(" ")} Previsões de peso nunca são garantidas.
              </span>
            </div>

            {msg && (
              <p role="status" className="rounded-xl bg-sage-soft px-3 py-2 text-sm text-forest">
                {msg}
              </p>
            )}
            {err && (
              <p role="alert" className="text-sm font-semibold text-error">
                {err}
              </p>
            )}
            {!lactante && (
              <Button block disabled={!safety.canSave || !targetValid} onClick={savePlan}>
                <Save /> {openPlan ? "Salvar como novo plano" : "Salvar plano"}
              </Button>
            )}
            {lactante && (
              <p className="text-xs text-muted">
                Para um plano individual durante a amamentação, procure nutricionista ou médico.
                Priorize recuperação pós-parto, nutrientes, água conforme a sede, sono e atividade
                liberada pelo seu profissional.
              </p>
            )}
          </Card>
        </>
      )}

      {/* Gráficos */}
      <Card className="space-y-2 p-4">
        <CardTitle className="text-base">Evolução e projeção</CardTitle>
        <ProjectionChart
          data={projection}
          targetKg={input.targetKg}
          description="Linha laranja: peso observado (média de 7 dias). Linha verde tracejada: projeção estimada com faixa provável em verde-claro."
        />
        <CardHint>A faixa mostra o intervalo provável — não é um resultado garantido.</CardHint>
      </Card>

      <Card className="space-y-2 p-4">
        <CardTitle className="text-base">Ingestão × gasto (14 dias)</CardTitle>
        {daily14.some((d) => d.ingestao !== null) ? (
          <IntakeVsExpenditureChart
            data={daily14}
            description="Barras laranjas: ingestão registrada. Barras verdes: gasto estimado do dia."
          />
        ) : (
          <CardHint>Registre refeições para ver este gráfico.</CardHint>
        )}
      </Card>

      <Card className="space-y-2 p-4">
        <CardTitle className="text-base">Saldo semanal</CardTitle>
        {weekly.length > 0 ? (
          <WeeklyBalanceChart
            data={weekly}
            description={weekly.map((w) => `${w.semana}: ${fmtInt(w.saldo)} kcal`).join("; ")}
          />
        ) : (
          <CardHint>Aparece depois de alguns dias com refeições registradas.</CardHint>
        )}
        <CardHint>
          Negativo = déficit estimado; positivo = superávit. Déficit maior não é necessariamente
          melhor.
        </CardHint>
      </Card>

      <Card className="space-y-2 p-4">
        <CardTitle className="text-base">Tempo previsto ao longo das semanas</CardTitle>
        {history.some((h) => h.semanas !== null) ? (
          <EtaHistoryChart
            data={history}
            description="Quantas semanas faltariam, pelo ritmo observado, em cada semana passada."
          />
        ) : (
          <CardHint>
            Precisa de pelo menos 3 pesagens em 2 semanas. Pese-se em condições parecidas (mesmo
            horário, em jejum de manhã) para comparar melhor.
          </CardHint>
        )}
      </Card>

      <ConfirmationDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title="Encerrar o plano?"
        description="Seus registros continuam. Você pode criar um novo plano quando quiser."
        confirmLabel="Encerrar"
        onConfirm={() => setStatus("encerrado")}
      />
    </>
  );
}

function ScenarioFacts({
  r,
  eta,
  intake,
  conf,
  compact,
}: {
  r: SimulationResult;
  eta: ReturnType<typeof etaRange>;
  intake: number;
  conf: keyof typeof CONF_LABEL;
  compact?: boolean;
}) {
  const e = r.energy;
  const facts: [string, string][] = [
    ["Ingestão", `${fmtInt(intake)} kcal/dia`],
    ["Gasto total", `${fmtInt(e.tdee)} kcal/dia`],
    [
      "Saldo",
      `${e.balance > 0 ? "+" : e.balance < 0 ? "−" : ""}${fmtInt(Math.abs(e.balance))} kcal/dia`,
    ],
    ["Exercício", `${fmtInt(e.weeklyExerciseKcal)} kcal/sem`],
    ["Atividade", `${fmt1(e.exerciseHoursPerWeek)} h/sem`],
    [
      "Tendência",
      r.direction === "manutencao"
        ? "manutenção"
        : `${r.initialWeeklyChangeKg > 0 ? "+" : ""}${fmt1(r.initialWeeklyChangeKg)} kg/sem`,
    ],
  ];
  if (!compact) {
    facts.push(["Até a meta", formatWeeksRange(eta)]);
    facts.push(["Confiança", CONF_LABEL[conf]]);
  }
  return (
    <dl className="tabular mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.7rem]">
      {facts.map(([k, v]) => (
        <div key={k} className="border-b border-line/70 py-0.5">
          <dt className="text-muted">{k}</dt>
          <dd className="font-semibold text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm font-semibold text-ink">
        {label}
        <span className="tabular font-display text-base font-bold text-forest">
          {fmtInt(value)} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[#0F5132]"
        aria-label={label}
      />
    </label>
  );
}

function WellbeingCheckin({ lactante }: { lactante: boolean }) {
  const { store, refresh } = useAppData();
  const [open, setOpen] = useState(false);
  const [energy, setEnergy] = useState(3);
  const [hunger, setHunger] = useState(3);
  const [flags, setFlags] = useState<RedFlag[]>([]);
  const [done, setDone] = useState(false);
  const keys = (Object.keys(RED_FLAG_SYMPTOMS) as RedFlag[]).filter(
    (k) => lactante || k !== "amamentacao",
  );

  async function save() {
    if (!store) return;
    await store.insert("wellbeing_entries", {
      logged_at: new Date().toISOString(),
      energy_level: energy,
      hunger_level: hunger,
      symptoms: flags.join(","),
      notes: null,
    });
    setDone(true);
    setOpen(false);
    refresh();
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Como você está se sentindo?</CardTitle>
          <CardHint>
            {done
              ? "Registro salvo. Obrigado por se cuidar."
              : "Energia, fome e sinais de alerta ajudam a manter o plano seguro."}
          </CardHint>
        </div>
        {!open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Registrar
          </Button>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          <Slider
            label="Energia (1 a 5)"
            value={energy}
            min={1}
            max={5}
            step={1}
            unit=""
            onChange={setEnergy}
          />
          <Slider
            label="Fome (1 a 5)"
            value={hunger}
            min={1}
            max={5}
            step={1}
            unit=""
            onChange={setHunger}
          />
          <div className="space-y-1">
            {keys.map((k) => (
              <Checkbox
                key={k}
                checked={flags.includes(k)}
                onChange={(v) => setFlags((f) => (v ? [...f, k] : f.filter((x) => x !== k)))}
                label={RED_FLAG_SYMPTOMS[k]}
              />
            ))}
          </div>
          <p className="text-xs text-muted">
            Esses registros não servem para diagnosticar nada
            {lactante ? " (nem a produção de leite)" : ""}. Se marcar algum sinal, pausamos as
            recomendações de perda de peso e sugerimos avaliação profissional.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" block onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button block onClick={save}>
              Salvar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Education({ lactante }: { lactante: boolean }) {
  const items = [
    "O peso varia de um dia para o outro por água, intestino, sal, ciclo menstrual e sono. Olhe a média das semanas, não um dia isolado.",
    "O gasto já inclui o seu movimento do dia a dia. O exercício entra só como o que ele acrescenta — nada é contado duas vezes.",
    "Com a perda de peso, o corpo passa a gastar um pouco menos. Por isso a projeção desacelera com o tempo, em vez de seguir uma linha reta.",
    "Pausar, manter ou mudar a meta faz parte do caminho. Não existe penalidade.",
    "Estas são estimativas educativas, não diagnóstico nem prescrição.",
  ];
  if (lactante)
    items.unshift(
      "Durante a amamentação, o Leveza não sugere déficit, ingestão mínima nem prazos. Converse com seu nutricionista ou médico, e acompanhe o crescimento do bebê com o pediatra.",
    );
  return (
    <Card className="p-4">
      <CardTitle className="flex items-center gap-2 text-base">
        <ShieldCheck className="size-5 text-forest" aria-hidden /> Bom saber
      </CardTitle>
      <ul className="mt-2 space-y-2 text-sm text-ink">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-orange" />
            {t}
          </li>
        ))}
      </ul>
      <details className="mt-3 rounded-xl bg-canvas p-3 text-xs text-ink">
        <summary className="flex cursor-pointer items-center gap-1 font-semibold text-forest">
          <Timer className="size-3.5" aria-hidden /> Como calculamos
        </summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-muted">
          <li>
            Metabolismo de repouso: Mifflin–St Jeor (1990). Sem o parâmetro da equação, usamos a
            média dos dois resultados.
          </li>
          <li>
            Gasto do dia = repouso × (horas de sono × 0,95 + horas acordada × MET do seu dia a dia).
            O exercício soma só o que passa do MET habitual (Compendium of Physical Activities).
          </li>
          <li>
            Projeção semana a semana: o gasto é recalculado com o novo peso e uma adaptação do
            metabolismo (5% a 15% do déficit) reduz o ritmo. ~7.700 kcal ≈ 1 kg é usado apenas como
            aproximação dentro desse modelo.
          </li>
          <li>
            A faixa combina cenários otimista e conservador (gasto ±8%, ou ±12% na amamentação). A
            tendência observada usa média móvel de 7 dias e regressão linear das últimas 6 semanas.
          </li>
        </ul>
      </details>
    </Card>
  );
}

function buildProjectionRows(
  points: { date: string; kg: number }[],
  r: SimulationResult,
  today: string,
): ProjectionRow[] {
  const out: ProjectionRow[] = [];
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const since = addDays(today, -56);
  const recent = sorted.filter((p) => p.date >= since);
  for (const p of recent) {
    const win = sorted.filter((q) => q.date <= p.date && q.date > addDays(p.date, -7));
    out.push({
      label: formatDateShort(p.date),
      observado: Math.round((win.reduce((s, q) => s + q.kg, 0) / win.length) * 10) / 10,
    });
  }
  for (const w of [0, 2, 4, 6, 8, 12, 16, 20, 24]) {
    const p = projectionAt(r, w);
    out.push({
      label: w === 0 ? "hoje" : `+${w} sem`,
      projetado: Math.round(p.central * 10) / 10,
      faixa: [Math.round(p.low * 10) / 10, Math.round(p.high * 10) / 10],
      observado: w === 0 ? (out[out.length - 1]?.observado ?? null) : null,
    });
  }
  return out;
}

function buildWeekly(rows: ReturnType<typeof useDailyReport>["rows"], today: string) {
  const out: { semana: string; saldo: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const end = addDays(today, -i * 7);
    const start = addDays(end, -6);
    const wk = rows.filter(
      (r) => r.date >= start && r.date <= end && r.consumed > 0 && r.balance !== null,
    );
    if (wk.length >= 3)
      out.push({
        semana: formatDateShort(start),
        saldo: wk.reduce((s, r) => s + (r.balance ?? 0), 0),
      });
  }
  return out;
}
