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
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  tone?: "forest" | "orange";
}) {
  return (
    <div className="flex items-center gap-3 py-2 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line">
      <Icon
        className={`size-6 shrink-0 ${tone === "orange" ? "text-orange" : "text-forest"}`}
        strokeWidth={2.2}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-xs text-ink/80">{label}</p>
        <p
          className={`tabular font-display text-lg font-bold leading-tight ${tone === "orange" ? "text-orange-ink" : "text-ink"}`}
        >
          {value}
        </p>
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
        <h2 className="font-display text-base font-bold">Seu balanço energético</h2>
        <button
          type="button"
          onClick={() => setInfo(true)}
          className="-mr-3 -mt-3 flex size-11 items-center justify-center rounded-full text-muted/70 hover:bg-sage-soft"
          aria-label="Como calculamos"
        >
          <Info className="size-4" />
        </button>
      </div>
      <div className="mt-1 flex items-center gap-4">
        <div className="flex shrink-0 flex-col items-center gap-1">
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
          {onEditGoal && (
            <button
              type="button"
              onClick={onEditGoal}
              aria-label={
                kcalTarget
                  ? `Editar meta diária (${fmtInt(kcalTarget)} kcal)`
                  : "Definir meta diária de calorias"
              }
              className="tabular flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-forest hover:bg-sage-soft"
            >
              <Pencil className="size-3.5" aria-hidden />
              {kcalTarget ? `Meta ${fmtInt(kcalTarget)} kcal` : "Definir meta"}
            </button>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Row icon={Utensils} label="Consumidas" value={`${fmtInt(consumed)} kcal`} />
          <Row
            icon={Flame}
            tone="orange"
            label="Gasto estimado"
            value={spent !== null ? `${fmtInt(spent)} kcal` : "—"}
          />
          <Row
            icon={CalendarCheck}
            tone="orange"
            label="Saldo do dia"
            value={balance !== null ? `${sign}${fmtInt(Math.abs(balance))} kcal` : "—"}
          />
        </div>
      </div>
      {energyMissing && <p className="mt-2 text-xs text-muted">{energyMissing}</p>}
      <Sheet open={info} onOpenChange={setInfo} title="Como estimamos o gasto">
        <div className="space-y-3 text-sm text-ink">
          {balance !== null && (
            <p className="rounded-xl bg-canvas px-3 py-2">
              <strong>Hoje:</strong> {describeBalance(balance)}.
              {isToday && energy
                ? ` O gasto mostrado é o estimado até agora; a projeção para 24 h é de ${isRange ? `${fmtInt(energy.projected24h.low)}–${fmtInt(energy.projected24h.high)}` : fmtInt(energy.projected24h.kcal)} kcal.`
                : ""}{" "}
              Saldo é informação, não pontuação.
            </p>
          )}
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
