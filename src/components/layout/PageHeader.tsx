"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

/** Cabeçalho das telas internas: seta de voltar à esquerda e título centralizado. */
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
    <header className="mb-4 pt-2">
      <div className="grid grid-cols-[minmax(2.75rem,1fr)_auto_minmax(2.75rem,1fr)] gap-1 items-center">
        <div>
          {back && (
            <Link
              href={back}
              aria-label="Voltar"
              className="-ml-2 flex size-11 items-center justify-center rounded-full text-ink hover:bg-sage-soft"
            >
              <ChevronLeft className="size-6" strokeWidth={2.2} />
            </Link>
          )}
        </div>
        <h1 className="text-center font-display text-[1.3rem] font-bold leading-tight text-ink">
          {title}
        </h1>
        <div className="flex justify-end">{action}</div>
      </div>
      {subtitle && <p className="mt-1 text-center text-sm text-muted">{subtitle}</p>}
    </header>
  );
}
