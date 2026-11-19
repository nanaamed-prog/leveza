"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNavigation } from "./BottomNavigation";
import { useAppData } from "@/lib/data/provider";
import { LoadingSkeleton } from "@/components/leveza/LoadingSkeleton";
import { FlaskConical } from "lucide-react";
import { Reminders } from "./Reminders";

export function AppShell({ children }: { children: ReactNode }) {
  const { status, profile, isDemo } = useAppData();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (status === "signed_out") router.replace("/login");
    else if (status === "ready" && !profile?.onboarding_completed_at) router.replace("/onboarding");
  }, [status, profile, router, path]);

  if (status !== "ready" || !profile?.onboarding_completed_at) {
    return (
      <main className="mx-auto max-w-xl p-4" aria-busy="true">
        <LoadingSkeleton lines={4} />
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-card focus:p-2"
      >
        Pular para o conteúdo
      </a>
      {isDemo && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 bg-orange-soft px-3 py-1.5 text-xs font-semibold text-orange-ink"
        >
          <FlaskConical className="size-3.5" aria-hidden />
          Modo demonstração — dados salvos só neste aparelho
        </div>
      )}
      <main id="conteudo" className="safe-bottom mx-auto w-full max-w-xl px-4 pt-2 md:max-w-3xl">
        {children}
      </main>
      <BottomNavigation />
      <Reminders />
    </div>
  );
}
