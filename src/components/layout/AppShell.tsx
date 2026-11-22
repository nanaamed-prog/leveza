"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNavigation } from "./BottomNavigation";
import { useAppData } from "@/lib/data/provider";
import { LoadingSkeleton } from "@/components/leveza/LoadingSkeleton";
import { FlaskConical, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reminders } from "./Reminders";

export function AppShell({ children }: { children: ReactNode }) {
  const { status, profile, isDemo } = useAppData();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (status === "signed_out") router.replace("/login");
    else if (status === "ready" && !profile?.onboarding_completed_at) router.replace("/onboarding");
  }, [status, profile, router, path]);

  if (status === "error") return <LoadError />;

  if (status !== "ready" || !profile?.onboarding_completed_at) {
    return (
      <main className="mx-auto max-w-xl p-4" aria-busy="true">
        <LoadingSkeleton lines={4} />
        <SlowHint />
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

function reload() {
  window.location.reload();
}

/** Depois de alguns segundos carregando, oferece tentar de novo. */
function SlowHint() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 7000);
    return () => clearTimeout(t);
  }, []);
  if (!slow) return null;
  return (
    <div className="mt-6 text-center">
      <p className="text-sm text-muted">Está demorando mais que o normal…</p>
      <Button variant="outline" className="mt-2" onClick={reload}>
        Tentar de novo
      </Button>
    </div>
  );
}

function LoadError() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-orange-soft text-orange-ink">
        <WifiOff className="size-7" aria-hidden />
      </span>
      <h1 className="font-display text-xl font-bold text-ink">Não conseguimos carregar agora</h1>
      <p className="text-sm text-muted">
        Confira sua internet e tente de novo. Seus registros estão guardados com segurança.
      </p>
      <Button onClick={reload}>Tentar de novo</Button>
    </main>
  );
}
