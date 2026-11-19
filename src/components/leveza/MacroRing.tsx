import {
  macroBreakdown,
  roundPercentages,
  MACRO_LABELS,
  type Macros,
  type MacroKey,
} from "@/lib/calc/macros";
import { fmt1 } from "@/lib/utils";

export const MACRO_COLORS: Record<MacroKey, string> = {
  protein: "var(--brand-forest)",
  carbs: "var(--brand-orange)",
  fat: "#E2A93B",
};

/** Rosca de distribuição energética dos macros (% das kcal dos três macros). */
export function MacroRing({
  macros,
  size = 120,
  centerKcal,
}: {
  macros: Macros;
  size?: number;
  /** Quando informado, mostra as kcal no centro e a legenda “Proteína: 32 g (37%)”. */
  centerKcal?: number;
}) {
  const b = macroBreakdown(macros);
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const keys: MacroKey[] = ["protein", "carbs", "fat"];
  let offset = 0;
  const rounded = b.percent ? roundPercentages(b.percent) : null;
  const desc = rounded
    ? keys.map((k) => `${MACRO_LABELS[k]} ${rounded[k]}%`).join(", ")
    : "Sem dados de macronutrientes";
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Distribuição energética: ${desc}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={stroke}
          />
          {b.percent &&
            keys.map((k) => {
              const frac = b.percent![k] / 100;
              const el = (
                <circle
                  key={k}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={MACRO_COLORS[k]}
                  strokeWidth={stroke}
                  strokeDasharray={`${Math.max(0, frac * c - 2)} ${c}`}
                  strokeDashoffset={-offset * c}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              offset += frac;
              return el;
            })}
        </svg>
        {centerKcal !== undefined && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
            <span className="tabular font-display text-2xl font-bold leading-none text-ink">
              {Math.round(centerKcal).toLocaleString("pt-BR")}
            </span>
            <span className="text-xs font-semibold text-ink">kcal</span>
          </div>
        )}
      </div>
      {centerKcal !== undefined ? (
        <ul className="min-w-0 space-y-2.5 text-sm">
          {keys.map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full"
                style={{ background: MACRO_COLORS[k] }}
              />
              <span className="tabular text-ink">
                {SHORT[k]}:{" "}
                {fmt1(
                  k === "protein" ? macros.proteinG : k === "carbs" ? macros.carbsG : macros.fatG,
                )}{" "}
                g ({rounded ? `${rounded[k]}%` : "—"})
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {keys.map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-3 rounded-full"
                style={{ background: MACRO_COLORS[k] }}
              />
              <span className="text-ink">{MACRO_LABELS[k]}</span>
              <span className="tabular ml-auto pl-2 font-semibold text-ink">
                {rounded ? `${rounded[k]}%` : "—"}
              </span>
              <span className="tabular w-14 text-right text-xs text-muted">
                {fmt1(
                  k === "protein" ? macros.proteinG : k === "carbs" ? macros.carbsG : macros.fatG,
                )}{" "}
                g
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const SHORT: Record<MacroKey, string> = {
  protein: "Proteína",
  carbs: "Carboidrato",
  fat: "Gordura",
};
