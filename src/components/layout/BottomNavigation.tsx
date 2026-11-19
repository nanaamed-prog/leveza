"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Utensils, PersonStanding, ChartColumn, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Início", icon: House, exact: true },
  { href: "/app/alimentacao", label: "Alimentação", icon: Utensils },
  { href: "/app/movimento", label: "Movimento", icon: PersonStanding },
  { href: "/app/evolucao", label: "Evolução", icon: ChartColumn },
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
                  "flex h-full flex-col items-center justify-center gap-1 text-[0.7rem]",
                  active ? "font-bold text-orange-ink" : "font-medium text-ink/80",
                )}
              >
                <Icon
                  className={cn("size-6", active ? "text-orange" : "text-ink/80")}
                  strokeWidth={active ? 2.4 : 1.8}
                  fill={active && href === "/app" ? "currentColor" : "none"}
                  aria-hidden
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
