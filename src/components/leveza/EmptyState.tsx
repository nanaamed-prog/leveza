import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-sage bg-card/60 px-4 py-8 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-sage-soft text-forest">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-display font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
