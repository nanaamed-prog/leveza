import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  href,
  tone = "forest",
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
  unit?: string;
  hint?: string;
  href?: string;
  tone?: "forest" | "orange" | "mineral";
}) {
  const toneCls = {
    forest: "bg-sage-soft text-forest",
    orange: "bg-orange-soft text-orange-ink",
    mineral: "bg-[#e1efeb] text-mineral",
  }[tone];
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className={cn("flex size-9 items-center justify-center rounded-full", toneCls)}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-muted">{label}</span>
        {href && <ChevronRight className="ml-auto size-4 text-muted" aria-hidden />}
      </div>
      <p className="mt-2 font-display text-xl font-bold text-ink">
        {value === null ? (
          <span className="text-base font-semibold text-muted">Sem registro</span>
        ) : (
          <span className="tabular">{value}</span>
        )}
        {value !== null && unit && (
          <span className="ml-1 text-sm font-semibold text-muted">{unit}</span>
        )}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = "block rounded-card border border-line bg-card p-3.5 shadow-card";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-sage")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
