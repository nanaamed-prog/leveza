"use client";

import { Flag, Utensils } from "lucide-react";
import { ProgressRing } from "./ProgressRing";
import { fastingState, formatHms } from "@/lib/calc/fasting";
import { formatTime, localDateKey } from "@/lib/dates";
import { useNow } from "@/lib/useNow";

function dayHint(ms: number, now: number, tz: string): string {
  const k = localDateKey(ms, tz);
  const today = localDateKey(now, tz);
  if (k === today) return "hoje";
  return k < today ? "ontem" : "amanhã";
}

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
        size={248}
        stroke={14}
        color="var(--brand-forest)"
        track="var(--brand-sage-soft)"
        label={`Jejum de ${hours} horas`}
      >
        <span className="font-display text-lg font-semibold text-ink">Em Jejum</span>
        <span
          className="tabular font-display text-[2.6rem] font-bold leading-tight text-ink"
          aria-live="off"
        >
          {formatHms(s.elapsedMs)}
        </span>
        <span className="tabular mt-1 flex items-center gap-1.5 text-xs text-ink">
          <Utensils className="size-3.5 text-forest" aria-hidden />
          Início: {formatTime(startedAt, tz)} ({dayHint(startedAt, now, tz)})
        </span>
        <span className="tabular mt-0.5 flex items-center gap-1.5 text-xs text-ink">
          <Flag className="size-3.5 text-forest" aria-hidden />
          Término: {formatTime(s.expectedEnd, tz)} ({dayHint(s.expectedEnd, now, tz)})
        </span>
      </ProgressRing>
      <p className="tabular mt-2 text-xs text-muted">
        {s.reachedTarget ? "Tempo planejado concluído" : `Faltam ${formatHms(s.remainingMs)}`}
      </p>
    </div>
  );
}
