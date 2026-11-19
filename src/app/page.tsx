import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Camera, Footprints, Moon, ShieldCheck } from "lucide-react";

export default function Welcome() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-14">
      <BrandLogo variant="vertical" showSlogan />
      <p className="mt-8 text-center text-[1.05rem] text-ink">
        Um diário de bem-estar para entender sua alimentação, movimento, sono e hábitos — com
        clareza e sem culpa.
      </p>
      <ul className="mt-8 space-y-3 text-sm">
        {[
          {
            icon: Camera,
            text: "Registre refeições por foto ou manualmente, sempre revisando as porções.",
          },
          {
            icon: Footprints,
            text: "Veja estimativas transparentes de gasto, sem contar nada duas vezes.",
          },
          { icon: Moon, text: "Acompanhe sono, água e o Plano 5+2 de hábitos." },
          { icon: ShieldCheck, text: "Triagem de segurança e privacidade conforme a LGPD." },
        ].map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex items-start gap-3 rounded-card border border-line bg-card p-3 shadow-card"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-soft text-forest">
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="pt-1.5 text-ink">{text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto space-y-3 pt-10">
        <Link
          href="/login"
          className="flex min-h-12 w-full items-center justify-center rounded-button bg-forest font-semibold text-white hover:bg-forest-hover"
        >
          Começar
        </Link>
        <p className="text-center text-xs text-muted">
          O Leveza não é dispositivo médico e não substitui acompanhamento profissional.{" "}
          <Link
            href="/privacidade"
            className="font-semibold text-forest underline underline-offset-2"
          >
            Privacidade
          </Link>
        </p>
      </div>
    </main>
  );
}
