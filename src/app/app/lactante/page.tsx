"use client";

import { useState } from "react";
import Link from "next/link";
import { Baby, CircleAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BreastfeedingPatternPicker } from "@/components/leveza/BreastfeedingPatternPicker";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { useAppData, useRecords } from "@/lib/data/provider";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { leaveLactationMode } from "@/lib/data/leaveLactation";
import { useRouter } from "next/navigation";
import { formatDateShort, formatTime, localDateKey } from "@/lib/dates";

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? null : n)}
            className={`min-h-11 flex-1 rounded-[12px] border text-sm font-semibold ${value === n ? "border-forest bg-forest text-white" : "border-line bg-card"}`}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function LactationPage() {
  const { store, refresh, tz, eligibility, screening, profile } = useAppData();
  const router = useRouter();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const logs = useRecords("wellbeing_entries", { limit: 14 });
  const [v, setV] = useState<{
    hunger: number | null;
    energy: number | null;
    symptoms: string;
    notes: string;
  }>({ hunger: null, energy: null, symptoms: "", notes: "" });
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader title="Modo Lactante" subtitle="Cuidado com você e com sua fase." back="/app" />
      {eligibility.mode !== "lactante" && (
        <p className="rounded-xl bg-canvas px-3 py-2 text-sm text-muted">
          Este modo é ativado quando a triagem indica amamentação.{" "}
          <Link href="/app/perfil/triagem" className="font-semibold text-forest underline">
            Revisar triagem
          </Link>
        </p>
      )}
      <Card className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Baby className="size-5 text-forest" aria-hidden /> Nesta fase
        </CardTitle>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink">
          <li>
            Coma o suficiente e com regularidade, priorizando alimentos variados e minimamente
            processados.
          </li>
          <li>Tenha água por perto e beba conforme a sede.</li>
          <li>Descanse sempre que possível; sono interrompido é comum e merece gentileza.</li>
          <li>
            O Leveza não oferece jejum programado, déficit calórico automático nem metas restritivas
            neste modo.
          </li>
          <li>
            Para alimentação, peso e suplementos, o acompanhamento individual com profissional de
            saúde é a melhor referência.
          </li>
        </ul>
      </Card>

      {eligibility.mode === "lactante" && (
        <Card className="space-y-2">
          <CardTitle>Como está a amamentação?</CardTitle>
          <CardHint>
            Amamentar gasta energia. O Leveza soma uma estimativa desse gasto ao seu gasto do dia e
            ao saldo, conforme o tipo de amamentação.
          </CardHint>
          <BreastfeedingPatternPicker />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        {(
          [
            ["/app/alimentacao/nova", "Registrar refeição"],
            ["/app/agua", "Registrar água"],
            ["/app/sono?novo=1", "Registrar sono"],
            ["/app/movimento?novo=1", "Atividade leve"],
          ] as const
        ).map(
          ([h, l]) =>
            h && (
              <Link
                key={h}
                href={h}
                className="flex min-h-11 items-center justify-center rounded-card border border-line bg-card px-3 text-center font-semibold text-forest"
              >
                {l}
              </Link>
            ),
        )}
      </div>

      <Card className="space-y-3">
        <CardTitle>Como você está hoje?</CardTitle>
        <Scale
          label="Fome (1 pouca · 5 muita)"
          value={v.hunger}
          onChange={(x) => setV({ ...v, hunger: x })}
        />
        <Scale
          label="Disposição (1 baixa · 5 alta)"
          value={v.energy}
          onChange={(x) => setV({ ...v, energy: x })}
        />
        <Field label="Sintomas ou sensações (opcional)">
          {({ id }) => (
            <Textarea
              id={id}
              value={v.symptoms}
              onChange={(e) => setV({ ...v, symptoms: e.target.value })}
            />
          )}
        </Field>
        <Field label="Observações (opcional)">
          {({ id }) => (
            <Textarea
              id={id}
              value={v.notes}
              onChange={(e) => setV({ ...v, notes: e.target.value })}
            />
          )}
        </Field>
        <Button
          block
          onClick={async () => {
            if (!store) return;
            await store.insert("wellbeing_entries", {
              logged_at: new Date().toISOString(),
              hunger_level: v.hunger,
              energy_level: v.energy,
              symptoms: v.symptoms.trim() || null,
              notes: v.notes.trim() || null,
            });
            setV({ hunger: null, energy: null, symptoms: "", notes: "" });
            setSaved(true);
            refresh();
          }}
        >
          Salvar
        </Button>
        {saved && (
          <p role="status" className="text-sm text-forest">
            Registro salvo.
          </p>
        )}
      </Card>

      <Card className="border-error/30">
        <CardTitle className="flex items-center gap-2 text-error">
          <CircleAlert className="size-5" aria-hidden /> Procure atendimento se houver
        </CardTitle>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Febre, mama vermelha, quente ou muito dolorida</li>
          <li>Tontura, desmaio ou cansaço extremo</li>
          <li>Tristeza intensa, ansiedade que não passa ou pensamentos que assustam</li>
          <li>Dúvidas sobre a alimentação ou o ganho de peso do bebê — converse com o pediatra</li>
        </ul>
        <CardHint className="mt-2">
          O app não avalia produção de leite nem faz diagnóstico.
        </CardHint>
      </Card>

      {logs.data.length > 0 && (
        <Card>
          <CardTitle className="mb-2">Registros recentes</CardTitle>
          <ul className="divide-y divide-line text-sm">
            {logs.data.map((l) => (
              <li key={l.id} className="py-2">
                <span className="tabular text-muted">
                  {formatDateShort(localDateKey(Date.parse(l.logged_at), tz))}{" "}
                  {formatTime(Date.parse(l.logged_at), tz)}
                </span>
                {" · "}fome {l.hunger_level ?? "—"} · disposição {l.energy_level ?? "—"}
                {l.symptoms && <span className="block text-muted">{l.symptoms}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {eligibility.mode === "lactante" && (
        <Card className="space-y-2">
          <CardTitle>Parou de amamentar?</CardTitle>
          <CardHint>
            Você pode desativar o Modo Lactante quando quiser. Atualizamos sua triagem e o app volta
            ao modo padrão. Jejum e metas de déficit só aparecem se o restante da sua triagem
            permitir.
          </CardHint>
          <Button variant="outline" block onClick={() => setConfirmLeave(true)}>
            Não estou mais amamentando — desativar Modo Lactante
          </Button>
          {leaveError && (
            <p role="alert" className="text-sm font-semibold text-error">
              {leaveError}
            </p>
          )}
        </Card>
      )}
      <ConfirmationDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Desativar o Modo Lactante?"
        description="Vamos registrar na sua triagem que você não está mais amamentando. Se voltar a amamentar, é só atualizar a triagem em Perfil."
        confirmLabel="Desativar"
        onConfirm={async () => {
          if (!store) return;
          try {
            await leaveLactationMode(store, screening, profile);
            refresh();
            router.push("/app");
          } catch (e) {
            setLeaveError(e instanceof Error ? e.message : "Não foi possível atualizar agora.");
          }
        }}
      />
    </div>
  );
}
