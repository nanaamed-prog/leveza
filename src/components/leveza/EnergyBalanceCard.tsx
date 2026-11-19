"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { ProgressRing } from "./ProgressRing";
import { Card } from "@/components/ui/card";
import { describeBalance, energyBalance, type DayEnergyResult } from "@/lib/calc/energy";
import { fmtInt } from "@/lib/utils";
import { Sheet } from "@/components/ui/dialog";

export function EnergyBalanceCard({
  consumed,
  energy,
  energyMissing,
  kcalTarget,
  isToday,
  isRange,
}: {
  consumed: number;
  energy: DayEnergyResult | null;
  energyMissing: string | null;
  kcalTarget: number | null;
  isToday: boolean;
  isRange: boolean;
}) {
  const [info, setInfo] = useState(false);
  const spent = energy?.elapsed.kcal ?? null;
  const balance = spent !== null ? energyBalance(consumed, spent) : null;
  const sign = balance === null ? "" : balance > 0 ? "+" : balance < 0 ? "−" : "";

  return (
    <Card className="overflow-hidden bg-forest p-5 text-white shadow-card">
      <div className="flex items-start justify-between">
        <h2 className="font-display text-base font-semibold">
          Balanço energético {isToday ? "de hoje" : "do dia"}
        </h2>
        <button
          type="button"
          onClick={() => setInfo(true)}
          className="-mr-2 -mt-2 flex size-11 items-center justify-center rounded-full text-sage hover:bg-white/10"
          aria-label="Como calculamos"
        >
          <Info className="size-5" />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <ProgressRing
          value={kcalTarget ? consumed / kcalTarget : null}
          size={128}
          stroke={11}
          color="var(--brand-orange)"
          track="rgba(255,255,255,0.16)"
          label="Consumo em relação à meta"
        >
          <span className="tabular font-display text-2xl font-bold">{fmtInt(consumed)}</span>
          <span className="text-xs text-sage">kcal consumidas</span>
          {kcalTarget ? (
            <span className="mt-0.5 text-[0.7rem] text-sage">meta {fmtInt(kcalTarget)}</span>
          ) : null}
        </ProgressRing>
        <dl className="flex-1 space-y-2.5 text-sm">
          <div>
            <dt className="text-sage">
              {isToday ? "Gasto estimado até agora" : "Gasto estimado do dia"}
            </dt>
            <dd className="tabular font-display text-lg font-bold">
              {spent !== null ? `${fmtInt(spent)} kcal` : "—"}
            </dd>
            {energy && isRange && (
              <dd className="tabular text-[0.7rem] text-sage">
                faixa {fmtInt(energy.elapsed.low)}–{fmtInt(energy.elapsed.high)}
              </dd>
            )}
          </div>
          {isToday && energy && (
            <div>
              <dt className="text-sage">Projeção para 24 h</dt>
              <dd className="tabular font-semibold">{fmtInt(energy.projected24h.kcal)} kcal</dd>
            </div>
          )}
          <div>
            <dt className="text-sage">Saldo (consumido − gasto)</dt>
            <dd className="tabular font-display text-lg font-bold">
              {balance !== null ? `${sign}${fmtInt(Math.abs(balance))} kcal` : "—"}
            </dd>
          </div>
        </dl>
      </div>
      <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs text-sage">
        {energyMissing ??
          (balance !== null
            ? `${describeBalance(balance)}. Saldo é informação, não pontuação.`
            : "")}
      </p>
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
