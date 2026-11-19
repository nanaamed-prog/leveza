"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Utensils, Footprints, TrendingUp, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Início", icon: House, exact: true },
  { href: "/app/alimentacao", label: "Alimentação", icon: Utensils },
  { href: "/app/movimento", label: "Movimento", icon: Footprints },
  { href: "/app/evolucao", label: "Evolução", icon: TrendingUp },
  { href: "/app/perfil", label: "Perfil", icon: UserRound },
];

export function BottomNavigation() {
  const path = usePathname()?.replace(/\/$/, "") || "/";
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid h-[var(--bottom-nav-h)] max-w-xl grid-cols-5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path === href || path.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[0.7rem] font-semibold",
                  active ? "text-forest" : "text-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full",
                    active && "bg-orange-soft",
                  )}
                >
                  <Icon className={cn("size-5", active && "text-orange-ink")} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
