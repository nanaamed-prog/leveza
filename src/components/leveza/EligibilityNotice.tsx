import { ShieldCheck } from "lucide-react";
import Link from "next/link";

/** Aviso de indisponibilidade por segurança — explica e encaminha, sem diagnosticar. */
export function EligibilityNotice({
  title = "Disponível só com avaliação adequada",
  reasons,
  showScreeningLink = true,
}: {
  title?: string;
  reasons: string[];
  showScreeningLink?: boolean;
}) {
  return (
    <div role="note" className="rounded-card border border-sage bg-sage-soft p-4 text-sm text-ink">
      <div className="mb-2 flex items-center gap-2 font-display font-semibold text-forest">
        <ShieldCheck className="size-5" aria-hidden />
        {title}
      </div>
      <ul className="space-y-1.5">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {showScreeningLink && (
        <Link
          href="/app/perfil/triagem"
          className="mt-3 inline-flex min-h-11 items-center font-semibold text-forest underline underline-offset-4"
        >
          Revisar minha triagem
        </Link>
      )}
    </div>
  );
}
