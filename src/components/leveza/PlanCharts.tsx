"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Legend,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, ChartFrame } from "./charts";

const axis = { stroke: CHART.text, fontSize: 11, tickLine: false, axisLine: false } as const;
const kg = (v: unknown) => `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;

export interface ProjectionRow {
  label: string;
  observado?: number | null;
  projetado?: number | null;
  faixa?: [number, number] | null;
}

/** Peso observado (média móvel) × projeção central com faixa de incerteza. */
export function ProjectionChart({
  data,
  targetKg,
  description,
}: {
  data: ProjectionRow[];
  targetKg: number;
  description: string;
}) {
  return (
    <ChartFrame title="Peso observado e projetado" description={description} height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={44} domain={["auto", "auto"]} />
        <Tooltip
          formatter={(v, name) =>
            Array.isArray(v) ? [`${kg(v[0])} – ${kg(v[1])}`, "Faixa provável"] : [kg(v), name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          dataKey="faixa"
          name="Faixa provável"
          stroke="none"
          fill={CHART.sage}
          fillOpacity={0.45}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          dataKey="projetado"
          name="Projeção (estimativa)"
          stroke={CHART.forest}
          strokeWidth={2.5}
          strokeDasharray="5 4"
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          dataKey="observado"
          name="Observado (média 7 dias)"
          stroke={CHART.orange}
          strokeWidth={2.5}
          dot={{ r: 3 }}
          connectNulls
          isAnimationActive={false}
        />
        <ReferenceLine
          y={targetKg}
          stroke={CHART.mineral}
          strokeDasharray="2 3"
          label={{ value: "meta", fill: CHART.text, fontSize: 11, position: "insideTopRight" }}
        />
      </ComposedChart>
    </ChartFrame>
  );
}

/** Prazo central por cenário, com a faixa de incerteza como barra de erro. */
export function ScenarioCompareChart({
  data,
  description,
}: {
  data: { nome: string; semanas: number; erro: [number, number] }[];
  description: string;
}) {
  return (
    <ChartFrame title="Comparação de cenários" description={description} height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="nome" {...axis} />
        <YAxis {...axis} width={44} />
        <Tooltip formatter={(v) => [`${v} semanas (estimativa central)`]} />
        <Bar dataKey="semanas" name="Semanas até a meta" fill={CHART.mineral} radius={[8, 8, 0, 0]}>
          <ErrorBar dataKey="erro" width={8} strokeWidth={1.5} stroke={CHART.forest} />
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

/** Ingestão × gasto estimado por dia. */
export function IntakeVsExpenditureChart({
  data,
  description,
}: {
  data: { dia: string; ingestao: number | null; gasto: number | null }[];
  description: string;
}) {
  return (
    <ChartFrame title="Ingestão e gasto estimado" description={description} height={210}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="dia" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={44} />
        <Tooltip
          formatter={(v, n) => [`${Math.round(Number(v)).toLocaleString("pt-BR")} kcal`, n]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="ingestao" name="Ingestão" fill={CHART.orange} radius={[6, 6, 0, 0]} />
        <Bar dataKey="gasto" name="Gasto estimado" fill={CHART.forest} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

/** Saldo semanal (soma dos dias com registro). Sem cores de “bom/ruim”. */
export function WeeklyBalanceChart({
  data,
  description,
}: {
  data: { semana: string; saldo: number }[];
  description: string;
}) {
  return (
    <ChartFrame title="Saldo semanal estimado" description={description} height={190}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="semana" {...axis} />
        <YAxis {...axis} width={52} />
        <ReferenceLine y={0} stroke={CHART.text} />
        <Tooltip
          formatter={(v) => [`${Math.round(Number(v)).toLocaleString("pt-BR")} kcal`, "Saldo"]}
        />
        <Bar dataKey="saldo" name="Saldo" fill={CHART.mineral} radius={[6, 6, 6, 6]} />
      </BarChart>
    </ChartFrame>
  );
}

/** Como o tempo previsto (pelo ritmo observado) mudou ao longo das semanas. */
export function EtaHistoryChart({
  data,
  description,
}: {
  data: { semana: string; semanas: number | null }[];
  description: string;
}) {
  return (
    <ChartFrame title="Evolução do tempo previsto" description={description} height={190}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="semana" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={44} />
        <Tooltip formatter={(v) => [`${v} semanas`, "Tempo previsto"]} />
        <Line
          dataKey="semanas"
          name="Semanas até a meta"
          stroke={CHART.forest}
          strokeWidth={2.5}
          dot={{ r: 3 }}
          connectNulls
        />
      </ComposedChart>
    </ChartFrame>
  );
}
