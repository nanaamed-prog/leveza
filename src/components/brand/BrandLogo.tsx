import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Símbolo Leveza (v2): folha dinâmica em degradê verde → laranja com nervura clara.
 * Desenho vetorial original. `dark` = versão para fundos escuros (ícone do app).
 */
export function BrandSymbol({ className, dark = false, title }: { className?: string; dark?: boolean; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={`lf-${id}`} x1="8" y1="56" x2="58" y2="6" gradientUnits="userSpaceOnUse">
          {dark ? (
            <>
              <stop offset="0" stopColor="#E4EFE4" />
              <stop offset="0.55" stopColor="#A3C9A8" />
              <stop offset="1" stopColor="#F2994A" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#0B3F27" />
              <stop offset="0.45" stopColor="#0F5132" />
              <stop offset="0.75" stopColor="#2E7D6B" />
              <stop offset="1" stopColor="#F2994A" />
            </>
          )}
        </linearGradient>
        <linearGradient id={`sw-${id}`} x1="6" y1="60" x2="60" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F2994A" />
          <stop offset="1" stopColor="#F7B267" />
        </linearGradient>
      </defs>
      <path d="M9 52C8.5 29 24 11 56 6C57.5 33 41 51.5 9 52Z" fill={`url(#lf-${id})`} />
      <path d="M15 46.5C22 35 33 24 49 13" fill="none" stroke={dark ? "#0F5132" : "#F6F3EC"} strokeWidth="3" strokeLinecap="round" />
      <path d="M5 58C21 52 39 49 59 37C55 51 35 61 5 58Z" fill={`url(#sw-${id})`} />
    </svg>
  );
}

/** Traço laranja que sublinha o nome. */
function Swoosh({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 16" className={className} aria-hidden preserveAspectRatio="none">
      <path d="M4 11C60 3 130 2 196 6" fill="none" stroke="#F2994A" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLogo({
  variant = "horizontal",
  dark = false,
  className,
  showSlogan = false,
}: {
  variant?: "horizontal" | "vertical" | "symbol";
  dark?: boolean;
  className?: string;
  showSlogan?: boolean;
}) {
  if (variant === "symbol") return <BrandSymbol className={cn("size-10", className)} dark={dark} title="Leveza" />;
  const word = <span className={cn("font-display font-bold tracking-tight", dark ? "text-canvas" : "text-forest")}>Leveza</span>;
  if (variant === "vertical") {
    return (
      <div className={cn("flex flex-col items-center text-center", className)} aria-label="Leveza">
        <BrandSymbol className="size-24" dark={dark} />
        <span className="-mt-1 text-5xl leading-none">{word}</span>
        <Swoosh className="mt-1 h-3 w-48" />
        <span className={cn("mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em]", dark ? "text-sage" : "text-forest")}>
          Saúde · Equilíbrio · Rotina real
        </span>
        {showSlogan && <span className={cn("mt-3 font-display text-lg italic", dark ? "text-sage" : "text-muted")}>Seu equilíbrio, todos os dias.</span>}
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-1.5", className)} aria-label="Leveza">
      <BrandSymbol className="size-9" dark={dark} />
      <span className="text-2xl leading-none">{word}</span>
    </div>
  );
}
