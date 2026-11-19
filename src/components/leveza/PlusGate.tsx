"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { usePlan } from "@/lib/data/usePlan";
import type { Feature } from "@/lib/plans";

/** Mostra o conteúdo se o plano permitir; senão, um convite gentil para conhecer o Plus. */
export function PlusGate({
  feature,
  title,
  text,
  children,
}: {
  feature: Feature;
  title: string;
  text: string;
  children: ReactNode;
}) {
  const plan = usePlan();
  if (plan.loading) return null;
  if (plan.can(feature)) return <>{children}</>;
  const ia = feature === "ia_foto" || feature === "ia_texto";
  return (
    <div className="rounded-card border border-orange/40 bg-orange-soft p-4">
      <p className="flex items-center gap-2 font-display font-semibold text-orange-ink">
        <Lock className="size-4" aria-hidden /> {title}
      </p>
      <p className="mt-1 text-sm text-ink">{text}</p>
      <Link
        href="/app/planos"
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-button bg-forest px-4 text-sm font-semibold text-white"
      >
        <Sparkles className="size-4" aria-hidden />{" "}
        {ia
          ? "Conhecer o Plus IA"
          : plan.trialUsed
            ? "Conhecer o Leveza Plus"
            : "Testar 7 dias grátis"}
      </Link>
    </div>
  );
}
