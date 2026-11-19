"use client";

import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { useAppData } from "@/lib/data/provider";
import { cumulativeBalanceEstimate, KCAL_PER_KG } from "@/lib/calc/weight";
import type { DailyRow } from "@/lib/reports";
import { fmt1, fmtInt } from "@/lib/utils";

const signedKcal = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmtInt(Math.abs(n))} kcal`;
const signedKg = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt1(Math.abs(n))} kg`;

/**
 * Saldo acumulado (consumido − gasto estimado) e a estimativa teórica de variação de peso
 * pela regra de ~7.700 kcal ≈ 1 kg. A estimativa em kg só aparece para perfis em que a
 * triagem permite metas de perda de peso (não aparece para gestantes, lactantes, menores
 * ou quando há contraindicação).
 */
export function BalanceEstimateCard({
  rows,
  today,
  days,
}: {
  rows: DailyRow[];
  today: string;
  days: number;
}) {
  const { eligibility } = useAppData();
  const est = cumulativeBalanceEstimate(rows, today);
  const showKg = eligibility.weightLoss.allowed && eligibility.calorieDeficit.allowed;
  const measured = rows.filter((r) => r.weightKg !== null);
  const scaleDelta =
    measured.length >= 2 ? measured[measured.length - 1]!.weightKg! - measured[0]!.weightKg! : null;

  return (
    <Card className="space-y-3">
      <CardTitle>Saldo acumulado {showKg ? "e peso estimado" : ""}</CardTitle>
      {est.days === 0 ? (
        <CardHint>
          Registre suas refeições por pelo menos um dia completo para ver o saldo acumulado (o dia
          de hoje entra quando terminar).
        </CardHint>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-canvas p-3">
              <dt className="text-xs font-semibold text-muted">Saldo em {est.days} dia(s)</dt>
              <dd className="tabular font-display text-lg font-bold">
                {signedKcal(est.totalBalanceKcal)}
              </dd>
              <dd className="tabular text-[0.7rem] text-muted">
                média {signedKcal(est.averageDailyKcal ?? 0)}/dia
              </dd>
            </div>
            {showKg ? (
              <div className="rounded-xl bg-sage-soft p-3">
                <dt className="text-xs font-semibold text-forest">Peso estimado pelo saldo</dt>
                <dd className="tabular font-display text-lg font-bold text-forest">
                  {signedKg(est.estimatedKg)}
                </dd>
                <dd className="text-[0.7rem] text-forest">≈ {fmtInt(KCAL_PER_KG)} kcal por kg</dd>
              </div>
            ) : (
              <div className="rounded-xl bg-canvas p-3">
                <dt className="text-xs font-semibold text-muted">Na balança</dt>
                <dd className="tabular font-display text-lg font-bold">
                  {scaleDelta !== null ? signedKg(scaleDelta) : "—"}
                </dd>
                <dd className="text-[0.7rem] text-muted">últimos {days} dias</dd>
              </div>
            )}
          </dl>
          {showKg && (
            <p className="text-sm text-ink">
              Na balança, no mesmo período:{" "}
              <strong className="tabular">
                {scaleDelta !== null ? signedKg(scaleDelta) : "registre o peso para comparar"}
              </strong>
            </p>
          )}
          <CardHint>
            {showKg
              ? "Estimativa teórica: a cada ~7.700 kcal de déficit acumulado, cerca de 1 kg. Na prática a perda costuma ser menor com o tempo, e a balança oscila com água e intestino. Use como referência, não como promessa."
              : "Por segurança, a estimativa de perda de peso não aparece para o seu perfil de triagem (por exemplo, durante a gestação ou amamentação). O saldo é mostrado apenas como informação."}
          </CardHint>
          <CardHint>
            Contamos só dias já encerrados que têm refeições registradas. Se algum dia ficou com
            registro incompleto, o déficit vai parecer maior do que foi.
          </CardHint>
        </>
      )}
    </Card>
  );
}
