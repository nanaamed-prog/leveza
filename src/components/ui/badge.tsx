import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-canvas text-muted border-line",
  forest: "bg-sage-soft text-forest border-sage",
  orange: "bg-orange-soft text-orange-ink border-orange/40",
  error: "bg-error-soft text-error border-error/30",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3.5",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
