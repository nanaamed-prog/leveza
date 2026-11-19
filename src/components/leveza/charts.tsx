"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";

/* Paleta dos gráficos: verde/laranja/mineral da marca — sem verde/vermelho como julgamento. */
export const CHART = {
  forest: "#0F5132",
  orange: "#F2994A",
  mineral: "#2E7D6B",
  sage: "#A3C9A8",
  grid: "#E3E9E1",
  text: "#5C6B62",
};

const axis = { stroke: CHART.text, fontSize: 11, tickLine: false, axisLine: false } as const;

export function ChartFrame({
  title,
  description,
  children,
  height = 220,
}: {
  title: string;
  description: string;
  children: ReactNode;
  height?: number;
}) {
  return (
    <figure aria-label={title} className="w-full">
      <figcaption className="sr-only">{description}</figcaption>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function SimpleBarChart({
  data,
  xKey,
  bars,
  unit,
  title,
  description,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  bars: { key: string; name: string; color: string }[];
  unit: string;
  title: string;
  description: string;
}) {
  return (
    <ChartFrame title={title} description={description}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey={xKey} {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={44} />
        <Tooltip
          formatter={(v) => [`${Math.round(Number(v)).toLocaleString("pt-BR")} ${unit}`]}
          cursor={{ fill: "rgba(163,201,168,0.18)" }}
        />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {bars.map((b) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name}
            fill={b.color}
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

export function SimpleLineChart({
  data,
  xKey,
  lines,
  unit,
  title,
  description,
  domain,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  lines: { key: string; name: string; color: string; dashed?: boolean }[];
  unit: string;
  title: string;
  description: string;
  domain?: [number | "auto" | "dataMin", number | "auto" | "dataMax"];
}) {
  return (
    <ChartFrame title={title} description={description}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey={xKey} {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={44} domain={domain ?? ["auto", "auto"]} />
        <Tooltip
          formatter={(v) => [
            `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}`,
          ]}
        />
        {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.color}
            strokeWidth={2.5}
            strokeDasharray={l.dashed ? "5 4" : undefined}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

export function PeriodFilter({
  value,
  onChange,
}: {
  value: number;
  onChange: (d: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Período" className="flex gap-1 rounded-full bg-line/60 p-1">
      {[7, 30, 90].map((d) => (
        <button
          key={d}
          role="radio"
          aria-checked={value === d}
          onClick={() => onChange(d)}
          className={`min-h-9 flex-1 rounded-full px-3 text-xs font-semibold ${value === d ? "bg-card text-forest shadow-card" : "text-muted"}`}
        >
          {d} dias
        </button>
      ))}
    </div>
  );
}
