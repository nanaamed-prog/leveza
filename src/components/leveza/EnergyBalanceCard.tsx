"use client";

import { CalendarCheck, Flame, Info, Pencil, Utensils } from "lucide-react";
import { useState } from "react";
import { ProgressRing } from "./ProgressRing";
import { Card } from "@/components/ui/card";
import { describeBalance, energyBalance, type DayEnergyResult } from "@/lib/calc/energy";
import { fmtInt } from "@/lib/utils";
import { Sheet } from "@/components/ui/dialog";

function Row({
  icon: Icon,
  label,
  value,
  tone = "forest",
  sub,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  tone?: "forest" | "orange";
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone === "orange" ? "bg-orange-soft text-orange-ink" : "bg-sage-soft text-forest"}`}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p
          className={`tabular font-display text-lg font-bold leading-tight ${tone === "orange" ? "text-orange-ink" : "text-ink"}`}
        >
          {value}
        </p>
        {sub && <p className="tabular text-[0.68rem] text-muted">{sub}</p>}
      </div>
    </div>
  );
}

export function EnergyBalanceCard({
  consumed,
  energy,
  energyMissing,
  kcalTarget,
  isToday,
  isRange,
  onEditGoal,
}: {
  consumed: number;
  energy: DayEnergyResult | null;
  energyMissing: string | null;
  kcalTarget: number | null;
  isToday: boolean;
  isRange: boolean;
  onEditGoal?: () => void;
}) {
  const [info, setInfo] = useState(false);
  const spent = energy?.elapsed.kcal ?? null;
  const balance = spent !== null ? energyBalance(consumed, spent) : null;
  const sign = balance === null ? "" : balance > 0 ? "+" : balance < 0 ? "−" : "";
  const pct = kcalTarget ? Math.round((consumed / kcalTarget) * 100) : null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <h2 className="font-display text-base font-semibold">Seu balanço energético</h2>
        <button
          type="button"
          onClick={() => setInfo(true)}
          className="-mr-2 -mt-2 flex size-11 items-center justify-center rounded-full text-muted hover:bg-sage-soft"
          aria-label="Como calculamos"
        >
          <Info className="size-5" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-4">
        <ProgressRing
          value={kcalTarget ? consumed / kcalTarget : null}
          size={124}
          stroke={12}
          color="var(--brand-forest)"
          track="var(--brand-sage-soft)"
          label="Consumo em relação à meta"
        >
          {pct !== null ? (
            <>
              <span className="tabular font-display text-3xl font-bold text-ink">{pct}%</span>
              <span className="text-xs text-muted">da meta</span>
            </>
          ) : (
            <>
              <span className="tabular font-display text-2xl font-bold text-ink">
                {fmtInt(consumed)}
              </span>
              <span className="text-xs text-muted">kcal hoje</span>
            </>
          )}
        </ProgressRing>
        <div className="flex-1 space-y-2.5">
          <Row
            icon={Utensils}
            label="Consumidas"
            value={`${fmtInt(consumed)} kcal`}
            sub={kcalTarget ? `meta ${fmtInt(kcalTarget)} kcal` : undefined}
          />
          <Row
            icon={Flame}
            tone="orange"
            label={isToday ? "Gasto estimado até agora" : "Gasto estimado"}
            value={spent !== null ? `${fmtInt(spent)} kcal` : "—"}
            sub={
              energy && isToday ? `projeção 24 h: ${fmtInt(energy.projected24h.kcal)}` : undefined
            }
          />
          <Row
            icon={CalendarCheck}
            tone="orange"
            label="Saldo do dia"
            value={balance !== null ? `${sign}${fmtInt(Math.abs(balance))} kcal` : "—"}
          />
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs text-muted">
        {energyMissing ??
          (balance !== null
            ? `${describeBalance(balance)}.${isRange && energy ? ` Projeção em faixa: ${fmtInt(energy.projected24h.low)}–${fmtInt(energy.projected24h.high)} kcal.` : ""} Saldo é informação, não pontuação.`
            : "")}
      </p>
      {onEditGoal && (
        <button
          type="button"
          onClick={onEditGoal}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-button text-sm font-semibold text-forest hover:bg-sage-soft"
        >
          <Pencil className="size-4" aria-hidden />
          {kcalTarget
            ? `Editar meta diária (${fmtInt(kcalTarget)} kcal)`
            : "Definir meta diária de calorias"}
        </button>
      )}
      <Sheet open={info} onOpenChange={setInfo} title="Como estimamos o gasto">
        <div className="space-y-3 text-sm text-ink">
          <p>
            Dividimos o seu dia em períodos que <strong>não se sobrepõem</strong>: sono registrado,
            atividades registradas e o restante do tempo acordado (de acordo com seu nível habitual
            de atividade).
          </p>
          <p>
            Cada período recebe um único valor de MET (equivalente metabólico). O gasto é MET × peso
            × horas, ajustado pelo seu metabolismo basal estimado (Mifflin–St Jeor). Nada é somado
            duas vezes: uma caminhada <em>substitui</em> o tempo de repouso daquele horário.
          </p>
          <p>
            “Até agora” considera o dia até este momento; a “projeção para 24 h” supõe que o
            restante do dia segue seu ritmo habitual.
          </p>
          <p className="text-muted">
            São estimativas com margem de erro (frequentemente ±10% ou mais). Não são medições e não
            substituem avaliação profissional.
          </p>
        </div>
      </Sheet>
    </Card>
  );
}
