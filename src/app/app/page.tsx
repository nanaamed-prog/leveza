"use client";

import Link from "next/link";
import {
  Camera,
  Mic,
  Waves,
  Plus,
  Footprints,
  Moon,
  MoonStar,
  Droplet,
  Droplets,
  PersonStanding,
  Scale,
  ListChecks,
  Timer,
  Baby,
  ChevronRight,
  Bell,
  CalendarDays,
} from "lucide-react";
import { HeroIllustration } from "@/components/leveza/HeroIllustration";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { EnergyBalanceCard } from "@/components/leveza/EnergyBalanceCard";
import { KcalGoalSheet } from "@/components/leveza/KcalGoalSheet";
import { useState } from "react";
import { MACRO_COLORS } from "@/components/leveza/MacroRing";
import { macroBreakdown } from "@/lib/calc/macros";
import { Card, CardTitle } from "@/components/ui/card";
import { useAppData, useRecords } from "@/lib/data/provider";
import { useDaySummary } from "@/lib/data/useDaySummary";
import { formatDuration } from "@/lib/dates";
import { fmt1, fmtInt, todayKey } from "@/lib/utils";
import { fastingState, formatHms } from "@/lib/calc/fasting";
import { useNow } from "@/lib/useNow";
import { describeSince, hoursSinceLast } from "@/lib/calc/bowel";

function shortDate(ms: number, tz: string): string {
  const s = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(ms);
  return s
    .replace(/\./g, "")
    .replace(" de ", " ")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/(\d+) (\p{L})/u, (_m, d: string, c: string) => `${d} ${c.toUpperCase()}`);
}

export default function Dashboard() {
  const { profile, tz, goal, preferences, latestWeight, eligibility } = useAppData();
  const today = todayKey(tz);
  const s = useDaySummary(today);
  const now = useNow(30_000);
  const habits = useRecords("habit_checkins", { eq: { date: today } });
  const fasting = useRecords("fasting_sessions", { limit: 1 });
  const bowel = useRecords("bowel_entries", { limit: 1 });
  const bowelSince = hoursSinceLast(
    bowel.data.map((b) => Date.parse(b.logged_at)),
    now,
  );
  const share = macroBreakdown(s.macros).percent;
  const weights = useRecords("weight_entries", { order: "asc", limit: 1 });
  const firstWeight = weights.data[0]?.weight_kg ?? null;
  const [goalOpen, setGoalOpen] = useState(false);
  const active = eligibility.fasting.allowed ? fasting.data.find((f) => !f.ended_at) : undefined;

  const quick = [
    { href: "/app/alimentacao/nova?modo=foto", label: "Fotografar refeição", icon: Camera },
    {
      href: "/app/alimentacao/nova?modo=descrever",
      label: "Falar ou escrever refeição",
      icon: Mic,
    },
    { href: "/app/alimentacao/nova", label: "Adicionar alimento", icon: Plus },
    { href: "/app/movimento?novo=1", label: "Registrar atividade", icon: Footprints },
    { href: "/app/sono?novo=1", label: "Registrar sono", icon: Moon },
    { href: "/app/agua", label: "Registrar água", icon: Droplets },
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <BrandLogo />
        <Link
          href="/app/configuracoes"
          className="relative flex size-11 items-center justify-center rounded-full bg-card text-forest shadow-card"
          aria-label="Lembretes e configurações"
        >
          <Bell className="size-5" aria-hidden />
          {(preferences?.remind_water || preferences?.remind_fasting) && (
            <span
              className="absolute right-2.5 top-2.5 size-2 rounded-full bg-orange"
              aria-hidden
            />
          )}
        </Link>
      </header>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[length:var(--text-display)] font-bold leading-tight">
            Olá, {profile?.display_name}! <span aria-hidden>👋</span>
          </h1>
          <p className="text-sm text-muted">Vamos cuidar do seu equilíbrio hoje?</p>
        </div>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-soft px-2.5 py-1 text-xs font-semibold text-orange-ink">
          <CalendarDays className="size-3.5" aria-hidden />
          {shortDate(now, tz)}
        </span>
      </div>

      <div className="-mx-4 overflow-hidden sm:mx-0 sm:rounded-card">
        <HeroIllustration className="h-28 w-full" />
      </div>

      <div className="relative z-10 -mt-10 space-y-4">
        <EnergyBalanceCard
          consumed={s.consumedKcal}
          energy={s.energy}
          energyMissing={s.energyMissing}
          kcalTarget={goal?.kcal_target ?? null}
          isToday
          isRange={s.bmr?.isRange ?? true}
          onEditGoal={() => setGoalOpen(true)}
        />
      </div>
      <KcalGoalSheet
        key={`${goalOpen}-${goal?.kcal_target ?? ""}`}
        open={goalOpen}
        onOpenChange={setGoalOpen}
        projectedExpenditure={s.energy?.projected24h.kcal ?? null}
        bmrKcal={s.bmr?.kcal ?? null}
        bmrLow={s.bmr?.low ?? null}
      />

      {eligibility.mode === "lactante" && (
        <Link
          href="/app/lactante"
          className="flex items-center gap-3 rounded-card border border-sage bg-sage-soft p-3 text-sm font-semibold text-forest"
        >
          <Baby className="size-5" aria-hidden /> Modo Lactante ativo — ver orientações
          <ChevronRight className="ml-auto size-4" aria-hidden />
        </Link>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Macronutrientes do dia</CardTitle>
          <Link href="/app/alimentacao" className="text-xs font-semibold text-forest">
            Ver refeições
          </Link>
        </div>
        {s.mealsCount === 0 ? (
          <p className="text-sm text-muted">
            Nenhuma refeição registrada hoje. Que tal registrar a próxima?
          </p>
        ) : (
          <div className="grid grid-cols-3">
            {(
              [
                ["Proteínas", s.macros.proteinG, share?.protein, MACRO_COLORS.protein],
                ["Carboidratos", s.macros.carbsG, share?.carbs, MACRO_COLORS.carbs],
                ["Gorduras", s.macros.fatG, share?.fat, MACRO_COLORS.fat],
              ] as const
            ).map(([label, g, pct, color]) => (
              <div
                key={label}
                className="border-line px-1 text-center [&:not(:first-child)]:border-l"
              >
                <p className="text-xs font-semibold text-ink">{label}</p>
                <p className="tabular font-display text-xl font-bold text-ink">{fmtInt(g)} g</p>
                <p className="tabular text-xs text-muted" title="Participação na energia do dia">
                  ({Math.round(pct ?? 0)}%)
                </p>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct ?? 0}%`, background: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            [
              "/app/movimento",
              PersonStanding,
              "Movimento",
              s.activityMinutes > 0 ? formatDuration(s.activityMinutes) : "—",
              "text-forest",
            ],
            [
              "/app/sono",
              MoonStar,
              "Sono",
              s.sleepMinutes !== null ? formatDuration(s.sleepMinutes) : "—",
              "text-forest",
            ],
            [
              "/app/agua",
              Droplet,
              "Água",
              s.waterMl > 0 ? `${fmt1(s.waterMl / 1000)} L` : "—",
              "text-forest",
            ],
          ] as const
        ).map(([href, Icon, label, value, tone]) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center rounded-card border border-line bg-card px-2 py-3 text-center shadow-card"
          >
            <Icon className={`size-7 ${tone}`} strokeWidth={2.2} aria-hidden />
            <span className="mt-1 text-sm font-semibold text-ink">{label}</span>
            <span className="tabular font-display text-lg font-bold text-ink">{value}</span>
          </Link>
        ))}
      </div>

      <Link href="/app/evolucao" className="block">
        <Card>
          <div className="mb-2 flex items-center gap-2">
            <Scale className="size-5 text-forest" aria-hidden />
            <CardTitle>Seu progresso</CardTitle>
            <ChevronRight className="ml-auto size-4 text-muted" aria-hidden />
          </div>
          {latestWeight ? (
            <>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">Peso atual</p>
                  <p className="tabular font-display text-xl font-bold">
                    {fmt1(latestWeight.weight_kg)} kg
                  </p>
                </div>
                {firstWeight && Math.abs(latestWeight.weight_kg - firstWeight) >= 0.1 && (
                  <span className="tabular rounded-full bg-sage-soft px-3 py-1 text-xs font-bold text-forest">
                    {latestWeight.weight_kg < firstWeight ? "↓ −" : "↑ +"}
                    {fmt1(Math.abs(latestWeight.weight_kg - firstWeight))} kg
                  </span>
                )}
                {goal?.target_weight_kg ? (
                  <div className="text-right">
                    <p className="text-xs text-muted">Meta</p>
                    <p className="tabular font-display text-xl font-bold">
                      {fmt1(goal.target_weight_kg)} kg
                    </p>
                  </div>
                ) : null}
              </div>
              {goal?.target_weight_kg && firstWeight && firstWeight !== goal.target_weight_kg ? (
                <div
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-line"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full bg-forest"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((firstWeight - latestWeight.weight_kg) / (firstWeight - goal.target_weight_kg)) * 100))}%`,
                    }}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted">Registre seu peso para acompanhar a evolução.</p>
          )}
        </Card>
      </Link>

      <Link
        href="/app/alimentacao/nova"
        className="flex min-h-16 items-center gap-4 rounded-full bg-forest px-6 py-3 text-white shadow-card hover:bg-forest-hover"
      >
        <Camera className="size-8 shrink-0" strokeWidth={1.8} aria-hidden />
        <span>
          <span className="block font-display text-lg font-bold leading-tight">
            Registrar refeição
          </span>
          <span className="block text-xs text-white/85">
            Fotografe, fale ou busque seu prato e veja as calorias.
          </span>
        </span>
      </Link>

      {active && (
        <Link href="/app/jejum" className="block">
          <Card className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-orange-soft text-orange-ink">
              <Timer className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-muted">
                Jejum de {active.protocol_hours} h em andamento
              </p>
              <p className="tabular font-display text-lg font-bold">
                {formatHms(
                  fastingState(Date.parse(active.started_at), active.protocol_hours, now).elapsedMs,
                )}
              </p>
            </div>
            <ChevronRight className="ml-auto size-4 text-muted" aria-hidden />
          </Card>
        </Link>
      )}

      <Link href="/app/intestino" className="block">
        <Card className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#e1efeb] text-mineral">
            <Waves className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-display font-semibold">Meu intestino</p>
            <p className="text-sm text-muted">
              {bowel.data.length
                ? `Último registro: ${describeSince(bowelSince).toLowerCase()}`
                : "Registre suas idas ao banheiro"}
            </p>
          </div>
          <ChevronRight className="ml-auto size-4 text-muted" aria-hidden />
        </Card>
      </Link>

      <Link href="/app/habitos" className="block">
        <Card className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-sage-soft text-forest">
            <ListChecks className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-display font-semibold">Hábitos de hoje</p>
            <p className="text-sm text-muted">
              {habits.data.filter((h) => h.status === "feito").length > 0
                ? `${habits.data.filter((h) => h.status === "feito").length} hábito(s) marcados`
                : "Plano 5+2: marque seus hábitos do dia"}
            </p>
          </div>
          <ChevronRight className="ml-auto size-4 text-muted" aria-hidden />
        </Card>
      </Link>

      <h2 className="px-1 pt-1 font-display text-sm font-bold text-ink">Atalhos</h2>
      <nav aria-label="Ações rápidas" className="-mx-4 -mt-2 overflow-x-auto px-4">
        <ul className="flex gap-2 pb-1">
          {quick.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-card px-4 text-sm font-semibold text-forest shadow-card hover:border-sage"
              >
                <Icon className="size-4 text-orange-ink" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Mais" className="grid grid-cols-2 gap-2 text-sm">
        {[
          ...(eligibility.mode === "lactante"
            ? [{ href: "/app/lactante", label: "Modo Lactante" }]
            : [{ href: "/app/jejum", label: "Jejum" }]),
          { href: "/app/plano", label: "Meu Plano" },
          { href: "/app/receitas", label: "Receitas" },
          { href: "/app/relatorios", label: "Relatórios" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex min-h-11 items-center justify-between rounded-card border border-line bg-card px-4 font-semibold text-forest"
          >
            {l.label}
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </Link>
        ))}
      </nav>
    </div>
  );
}
