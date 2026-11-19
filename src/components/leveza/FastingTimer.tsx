"use client";

import { ProgressRing } from "./ProgressRing";
import { fastingState, formatHms } from "@/lib/calc/fasting";
import { formatTime } from "@/lib/dates";
import { useNow } from "@/lib/useNow";

export function FastingTimer({
  startedAt,
  hours,
  tz,
}: {
  startedAt: number;
  hours: number;
  tz: string;
}) {
  const now = useNow(1000);
  const s = fastingState(startedAt, hours, now);
  return (
    <div className="flex flex-col items-center">
      <ProgressRing
        value={s.progress}
        size={220}
        stroke={16}
        color="var(--brand-forest)"
        track="var(--brand-sage-soft)"
        label={`Jejum de ${hours} horas`}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Em jejum</span>
        <span className="tabular font-display text-3xl font-bold text-ink" aria-live="off">
          {formatHms(s.elapsedMs)}
        </span>
        <span className="tabular text-xs text-muted">
          {s.reachedTarget ? "Tempo planejado concluído" : `faltam ${formatHms(s.remainingMs)}`}
        </span>
      </ProgressRing>
      <dl className="mt-4 grid w-full grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-xl bg-canvas p-2">
          <dt className="text-xs text-muted">Início</dt>
          <dd className="tabular font-semibold">{formatTime(startedAt, tz)}</dd>
        </div>
        <div className="rounded-xl bg-canvas p-2">
          <dt className="text-xs text-muted">Término previsto</dt>
          <dd className="tabular font-semibold">{formatTime(s.expectedEnd, tz)}</dd>
        </div>
      </dl>
    </div>
  );
}
