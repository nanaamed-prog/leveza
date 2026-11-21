"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrivacyControls } from "@/components/leveza/PrivacyControls";
import { ResetControls } from "@/components/leveza/ResetControls";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/form";
import { useAppData } from "@/lib/data/provider";

export default function SettingsPage() {
  const { preferences, store, refresh } = useAppData();

  async function toggle(key: "remind_water" | "remind_fasting", v: boolean) {
    if (!store || !preferences) return;
    if (v && "Notification" in window && Notification.permission === "default")
      await Notification.requestPermission();
    const { id: _i, user_id: _u, created_at: _c, updated_at: _up, ...rest } = preferences;
    void _i;
    void _u;
    void _c;
    void _up;
    await store.upsertSingle("user_preferences", { ...rest, [key]: v });
    refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Configurações" back="/app/perfil" />
      <Card className="space-y-2">
        <CardTitle>Lembretes</CardTitle>
        <Checkbox
          checked={preferences?.remind_water ?? false}
          onChange={(v) => toggle("remind_water", v)}
          label="Lembrar de beber água"
        />
        <Checkbox
          checked={preferences?.remind_fasting ?? false}
          onChange={(v) => toggle("remind_fasting", v)}
          label="Avisar quando o tempo de jejum planejado terminar"
        />
        <CardHint>
          Nesta versão, os lembretes dependem de permissão de notificação e funcionam com o app
          aberto. Notificações push em segundo plano estão no roteiro.
        </CardHint>
      </Card>
      <ResetControls />
      <PrivacyControls />
      <Card>
        <CardTitle>Sobre as estimativas</CardTitle>
        <CardHint className="mt-1">
          Calorias, macros, gasto energético e porções por foto são <strong>estimativas</strong>.
          Valores que você digita aparecem como “informado”; o peso que você mede como “medido”.
          Nada aqui é diagnóstico.
        </CardHint>
        <Link
          href="/privacidade"
          className="mt-2 inline-flex min-h-11 items-center font-semibold text-forest underline"
        >
          Política de privacidade
        </Link>
      </Card>
    </div>
  );
}
