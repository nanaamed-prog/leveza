"use client";

import Link from "next/link";
import {
  Camera,
  Mic,
  Waves,
  Plus,
  Footprints,
  Moon,
  Droplets,
  Scale,
  ListChecks,
  Timer,
  Baby,
  ChevronRight,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { EnergyBalanceCard } from "@/components/leveza/EnergyBalanceCard";
import { StatCard } from "@/components/leveza/StatCard";
import { MacroProgress } from "@/components/leveza/MacroProgress";
import { MACRO_COLORS } from "@/components/leveza/MacroRing";
import { macroBreakdown } from "@/lib/calc/macros";
import { Card, CardTitle } from "@/components/ui/card";
import { useAppData, useRecords } from "@/lib/data/provider";
import { useDaySummary } from "@/lib/data/useDaySummary";
import { formatDateLong, formatDuration, greeting } from "@/lib/dates";
import { fmt1, fmtInt, todayKey } from "@/lib/utils";
import { fastingState, formatHms } from "@/lib/calc/fasting";
import { useNow } from "@/lib/useNow";
import { describeSince, hoursSinceLast } from "@/lib/calc/bowel";

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
          href="/app/perfil"
          className="flex size-11 items-center justify-center rounded-full bg-sage-soft font-display font-bold text-forest"
          aria-label="Perfil"
        >
          {profile?.display_name?.[0]?.toUpperCase() ?? "L"}
        </Link>
      </header>
      <div>
        <h1 className="text-[length:var(--text-display)] font-bold leading-tight">
          {greeting(now, tz)}, {profile?.display_name}
        </h1>
        <p className="text-sm text-muted first-letter:uppercase">{formatDateLong(now, tz)}</p>
      </div>

      {eligibility.mode === "lactante" && (
        <Link
          href="/app/lactante"
          className="flex items-center gap-3 rounded-card border border-sage bg-sage-soft p-3 text-sm font-semibold text-forest"
        >
          <Baby className="size-5" aria-hidden /> Modo Lactante ativo — ver orientações
          <ChevronRight className="ml-auto size-4" aria-hidden />
        </Link>
      )}

      <EnergyBalanceCard
        consumed={s.consumedKcal}
        energy={s.energy}
        energyMissing={s.energyMissing}
        kcalTarget={goal?.kcal_target ?? null}
        isToday
        isRange={s.bmr?.isRange ?? true}
      />

      <nav aria-label="Ações rápidas" className="-mx-4 overflow-x-auto px-4">
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

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Macronutrientes de hoje</CardTitle>
          <Link href="/app/alimentacao" className="text-sm font-semibold text-forest">
            Ver refeições
          </Link>
        </div>
        {s.mealsCount === 0 ? (
          <p className="text-sm text-muted">
            Nenhuma refeição registrada hoje. Que tal registrar a próxima?
          </p>
        ) : (
          <div className="space-y-3">
            <MacroProgress
              label="Proteínas"
              grams={s.macros.proteinG}
              energyShare={share?.protein}
              color={MACRO_COLORS.protein}
            />
            <MacroProgress
              label="Carboidratos"
              grams={s.macros.carbsG}
              energyShare={share?.carbs}
              color={MACRO_COLORS.carbs}
            />
            <MacroProgress
              label="Gorduras"
              grams={s.macros.fatG}
              energyShare={share?.fat}
              color={MACRO_COLORS.fat}
            />
          </div>
        )}
      </Card>

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

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Droplets}
          label="Água"
          tone="mineral"
          value={s.waterMl > 0 ? fmtInt(s.waterMl) : null}
          unit="ml"
          hint={preferences ? `Meta: ${fmtInt(preferences.water_goal_ml)} ml` : undefined}
          href="/app/agua"
        />
        <StatCard
          icon={Footprints}
          label="Movimento"
          tone="orange"
          value={s.activityMinutes > 0 ? formatDuration(s.activityMinutes) : null}
          hint={
            s.energy && s.activityMinutes > 0
              ? `${fmtInt(s.energy.projected24h.kcalBy.activity)} kcal estimadas`
              : undefined
          }
          href="/app/movimento"
        />
        <StatCard
          icon={Moon}
          label="Sono"
          value={s.sleepMinutes !== null ? formatDuration(s.sleepMinutes) : null}
          hint="Noite passada, duração efetiva"
          href="/app/sono"
        />
        <StatCard
          icon={Scale}
          label="Peso"
          value={latestWeight ? fmt1(latestWeight.weight_kg) : null}
          unit="kg"
          hint="Último registro"
          href="/app/evolucao"
        />
      </div>

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
