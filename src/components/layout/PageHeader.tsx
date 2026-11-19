"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-4 flex items-start gap-2 pt-2">
      {back && (
        <Link
          href={back}
          aria-label="Voltar"
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-forest hover:bg-sage-soft"
        >
          <ArrowLeft className="size-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-[length:var(--text-display)] font-bold leading-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
