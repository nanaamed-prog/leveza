"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { ChoiceGroup, Checkbox } from "@/components/ui/form";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useAppData, useRecords } from "@/lib/data/provider";
import { ALL_TABLES, CONSENT_VERSION, type Consent, type PhotoRetention } from "@/lib/data/types";
import { apiFetch } from "@/lib/api";

export function PrivacyControls() {
  const router = useRouter();
  const { store, preferences, refresh, signOut } = useAppData();
  const consents = useRecords("consents", { limit: 100 });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const latest = (p: Consent["purpose"]) =>
    consents.data.find((c) => c.purpose === p)?.granted ?? false;

  async function setConsent(purpose: Consent["purpose"], granted: boolean) {
    if (!store) return;
    await store.insert("consents", { purpose, version: CONSENT_VERSION, granted });
    refresh();
  }

  async function setRetention(r: PhotoRetention) {
    if (!store || !preferences) return;
    const { id: _i, user_id: _u, created_at: _c, updated_at: _up, ...rest } = preferences;
    void _i;
    void _u;
    void _c;
    void _up;
    await store.upsertSingle("user_preferences", { ...rest, photo_retention: r });
    refresh();
  }

  async function exportData() {
    if (!store) return;
    const out: Record<string, unknown> = {
      exportado_em: new Date().toISOString(),
      aviso: "Dados pessoais e de saúde — guarde com cuidado.",
    };
    for (const t of ALL_TABLES) {
      out[t] =
        t === "profiles" || t === "user_preferences"
          ? await store.getSingle(t)
          : await store.list(t, { limit: 10000 });
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leveza-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Arquivo de exportação gerado.");
  }

  async function deleteAll() {
    if (!store) return;
    if (store.kind === "demo") {
      await store.wipeAll();
    } else {
      const res = await apiFetch("/api/conta/excluir", { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setMsg(j.error ?? "Não foi possível excluir agora.");
        return;
      }
    }
    await signOut();
    router.replace("/");
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardTitle>Fotos das refeições</CardTitle>
        <ChoiceGroup
          legend="Depois da análise, o que fazer com a foto?"
          value={preferences?.photo_retention ?? "nao_guardar"}
          onChange={setRetention}
          options={[
            {
              value: "nao_guardar",
              label: "Não guardar (padrão)",
              description: "A foto é usada só para a análise e descartada.",
            },
            {
              value: "30_dias",
              label: "Guardar por 30 dias",
              description: "Depois é apagada automaticamente.",
            },
            { value: "manter", label: "Guardar até eu excluir" },
          ]}
        />
        <CardHint>
          Fotos guardadas ficam em armazenamento privado, acessível só por links temporários.
        </CardHint>
      </Card>

      <Card className="space-y-2">
        <CardTitle>Consentimentos</CardTitle>
        <Checkbox
          checked={latest("dados_saude")}
          onChange={(v) => setConsent("dados_saude", v)}
          label="Tratamento de dados de saúde"
          description="Sem ele, o app não consegue funcionar; revogar equivale a pedir a exclusão."
        />
        <Checkbox
          checked={latest("fotos_analise")}
          onChange={(v) => setConsent("fotos_analise", v)}
          label="Análise de fotos por IA"
        />
        <Checkbox
          checked={latest("fotos_treinamento")}
          onChange={(v) => setConsent("fotos_treinamento", v)}
          label="Uso de fotos para melhorar modelos"
          description="Desligado por padrão."
        />
        <CardHint>Cada alteração é registrada com data e versão ({CONSENT_VERSION}).</CardHint>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Seus dados</CardTitle>
        <Button variant="outline" block onClick={exportData}>
          <Download /> Exportar meus dados (JSON)
        </Button>
        <Button variant="danger" block onClick={() => setConfirmDelete(true)}>
          <Trash2 />{" "}
          {store?.kind === "demo"
            ? "Apagar dados deste aparelho"
            : "Excluir conta e todos os dados"}
        </Button>
        {msg && (
          <p role="status" className="text-sm text-forest">
            {msg}
          </p>
        )}
      </Card>

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir tudo?"
        description="Seus registros, fotos e a conta serão apagados de forma permanente. Considere exportar antes."
        confirmLabel="Excluir definitivamente"
        danger
        onConfirm={deleteAll}
      />
    </div>
  );
}
