"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDateShort } from "@/lib/dates";

export function DayNav({
  value,
  onChange,
  today,
}: {
  value: string;
  onChange: (d: string) => void;
  today: string;
}) {
  const label =
    value === today ? "Hoje" : value === addDays(today, -1) ? "Ontem" : formatDateShort(value);
  return (
    <div className="flex items-center justify-between rounded-full border border-line bg-card p-1">
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-full text-forest hover:bg-sage-soft"
        aria-label="Dia anterior"
        onClick={() => onChange(addDays(value, -1))}
      >
        <ChevronLeft className="size-5" />
      </button>
      <span className="font-display font-semibold" aria-live="polite">
        {label}
      </span>
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-full text-forest hover:bg-sage-soft disabled:opacity-30"
        aria-label="Próximo dia"
        disabled={value >= today}
        onClick={() => onChange(addDays(value, 1))}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
