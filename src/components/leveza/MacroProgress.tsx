import { fmt1 } from "@/lib/utils";

/**
 * Barra de um macro. Com meta: progresso até a meta. Sem meta: largura = participação na energia
 * dos três macros (nunca sugere que algo está "completo").
 */
export function MacroProgress({
  label,
  grams,
  targetG,
  energyShare,
  color,
}: {
  label: string;
  grams: number;
  targetG?: number | null;
  energyShare?: number | null;
  color: string;
}) {
  const pct = targetG ? Math.min(100, (grams / targetG) * 100) : (energyShare ?? 0);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="tabular text-muted">
          {fmt1(grams)} g
          {targetG
            ? ` de ${fmt1(targetG)} g`
            : energyShare != null
              ? ` · ${Math.round(energyShare)}% da energia`
              : ""}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-line" role="presentation">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
