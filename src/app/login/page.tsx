"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAppData } from "@/lib/data/provider";
import { FlaskConical } from "lucide-react";

const schema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { status, enterDemo } = useAppData();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (status === "ready") router.replace("/app");
  }, [status, router]);

  async function onSubmit(v: FormValues) {
    setMsg(null);
    const sb = getSupabase()!;
    if (mode === "entrar") {
      const { error } = await sb.auth.signInWithPassword(v);
      if (error)
        setMsg({
          tone: "error",
          text: "E-mail ou senha incorretos, ou e-mail ainda não confirmado.",
        });
    } else {
      const { data, error } = await sb.auth.signUp({
        ...v,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });
      if (error)
        setMsg({
          tone: "error",
          text: "Não foi possível criar a conta. Tente outro e-mail ou mais tarde.",
        });
      else if (!data.session)
        setMsg({ tone: "ok", text: "Enviamos um link de confirmação para o seu e-mail. Depois de confirmar, volte aqui e toque em Entrar." });
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <Link href="/" aria-label="Voltar ao início">
        <BrandLogo />
      </Link>
      <h1 className="mt-8 text-2xl font-bold">
        {mode === "entrar" ? "Que bom te ver" : "Criar sua conta"}
      </h1>

      {isSupabaseConfigured ? (
        <>
          <div
            role="tablist"
            aria-label="Acesso"
            className="mt-5 grid grid-cols-2 rounded-button bg-line/60 p-1"
          >
            {(["entrar", "criar"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`min-h-10 rounded-[12px] text-sm font-semibold ${mode === m ? "bg-card text-forest shadow-card" : "text-muted"}`}
              >
                {m === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
            <Field label="E-mail" error={formState.errors.email?.message}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("email")}
                />
              )}
            </Field>
            <Field
              label="Senha"
              error={formState.errors.password?.message}
              hint={mode === "criar" ? "Mínimo de 8 caracteres." : undefined}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete={mode === "entrar" ? "current-password" : "new-password"}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("password")}
                />
              )}
            </Field>
            {msg && (
              <p
                role="alert"
                className={`rounded-xl px-3 py-2 text-sm ${msg.tone === "error" ? "bg-error-soft text-error" : "bg-sage-soft text-forest"}`}
              >
                {msg.text}
              </p>
            )}
            <Button type="submit" block size="lg" disabled={formState.isSubmitting}>
              {mode === "entrar" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
        </>
      ) : (
        <Card className="mt-6 space-y-3">
          <div className="flex items-center gap-2 font-display font-semibold text-orange-ink">
            <FlaskConical className="size-5" aria-hidden /> Modo demonstração
          </div>
          <p className="text-sm text-ink">
            O servidor de contas (Supabase) ainda não foi configurado. Você pode testar o Leveza com
            seus dados salvos <strong>somente neste aparelho</strong>. Nada é enviado para
            servidores.
          </p>
          <Button block size="lg" onClick={enterDemo}>
            Entrar no modo demonstração
          </Button>
        </Card>
      )}
      <p className="mt-auto pt-8 text-center text-xs text-muted">
        Ao continuar, você concorda com a{" "}
        <Link href="/privacidade" className="font-semibold text-forest underline">
          Política de Privacidade
        </Link>
        .
      </p>
    </main>
  );
}
