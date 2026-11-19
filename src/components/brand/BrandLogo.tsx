import { cn } from "@/lib/utils";

/** Símbolo original Leveza: folha dinâmica (verde) + traço de equilíbrio (laranja). */
export function BrandSymbol({
  className,
  dark = false,
  title,
}: {
  className?: string;
  dark?: boolean;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        d="M13 49C13 27.5 27.6 11.6 52 9.5C52.6 33.6 37.7 49.4 13 49Z"
        fill={dark ? "#A3C9A8" : "#0F5132"}
      />
      <path
        d="M19 44.5C23.5 34 32 24 46 15"
        fill="none"
        stroke={dark ? "#0B2E1F" : "#F6F3EC"}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M8 55.5C22.5 47.5 39.5 45.5 57 31C53.5 47.5 36.5 59.5 8 55.5Z" fill="#F2994A" />
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
  if (variant === "symbol")
    return <BrandSymbol className={cn("size-10", className)} dark={dark} title="Leveza" />;
  const word = (
    <span
      className={cn("font-display font-bold tracking-tight", dark ? "text-canvas" : "text-forest")}
    >
      Leveza
    </span>
  );
  if (variant === "vertical") {
    return (
      <div
        className={cn("flex flex-col items-center gap-2 text-center", className)}
        aria-label="Leveza"
      >
        <BrandSymbol className="size-20" dark={dark} />
        <span className="text-4xl">{word}</span>
        {showSlogan && (
          <span className={cn("text-sm", dark ? "text-sage" : "text-muted")}>
            Seu equilíbrio, todos os dias.
          </span>
        )}
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-2", className)} aria-label="Leveza">
      <BrandSymbol className="size-8" dark={dark} />
      <span className="text-xl">{word}</span>
    </div>
  );
}
