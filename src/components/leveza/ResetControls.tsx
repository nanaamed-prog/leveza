"use client";

import { useState } from "react";
import { CalendarX2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Sheet } from "@/components/ui/dialog";
import { useAppData } from "@/lib/data/provider";
import { resetAllDays, resetDay } from "@/lib/data/reset";
import { formatDateShort } from "@/lib/dates";
import { todayKey } from "@/lib/utils";

const CONFIRM_WORD = "APAGAR";

async function removeFiles(paths: string[]) {
  const { getSupabase } = await import("@/lib/supabase/client");
  await getSupabase()?.storage.from("food-photos").remove(paths);
}

/** Recomeçar: apagar os registros de um dia ou de todos os dias. Perfil, triagem e metas ficam. */
export function ResetControls() {
  const { store, tz, refresh } = useAppData();
  const today = todayKey(tz);
  const [mode, setMode] = useState<"dia" | "todos" | null>(null);
  const [day, setDay] = useState(today);
  const [withWeight, setWithWeight] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function open(m: "dia" | "todos") {
    setMode(m);
    setDay(today);
    setWithWeight(false);
    setTyped("");
    setErr(null);
  }

  async function run() {
    if (!store || !mode) return;
    setBusy(true);
    setErr(null);
    try {
      if (mode === "dia") {
        const n = await resetDay(store, day, tz, { includeWeight: withWeight, removeFiles });
        setMsg(
          n > 0
            ? `${n} registro(s) de ${day === today ? "hoje" : formatDateShort(day)} apagado(s).`
            : `Não havia registros em ${day === today ? "hoje" : formatDateShort(day)}.`,
        );
      } else {
        await resetAllDays(store, { includeWeight: withWeight, removeFiles });
        setMsg("Todos os registros diários foram apagados. Seu perfil e suas metas continuam.");
      }
      setMode(null);
      refresh();
    } catch {
      setErr("Não foi possível apagar agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const canRun =
    mode === "dia" ? Boolean(day) && day <= today : typed.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <Card className="space-y-3">
      <div>
        <CardTitle>Recomeçar registros</CardTitle>
        <CardHint className="mt-1">
          Apaga refeições, água, atividades, sono, jejuns, hábitos e intestino. Seu perfil, triagem,
          metas, receitas e assinatura continuam.
        </CardHint>
      </div>
      {msg && (
        <p role="status" className="rounded-xl bg-sage-soft px-3 py-2 text-sm text-forest">
          {msg}
        </p>
      )}
      <div className="grid gap-2">
        <Button variant="outline" block onClick={() => open("dia")}>
          <RotateCcw /> Resetar o dia
        </Button>
        <Button variant="outline" block className="text-error" onClick={() => open("todos")}>
          <CalendarX2 /> Resetar todos os dias
        </Button>
      </div>

      <Sheet
        open={mode !== null}
        onOpenChange={(o) => !o && !busy && setMode(null)}
        title={mode === "dia" ? "Resetar o dia" : "Resetar todos os dias"}
        description={
          mode === "dia"
            ? "Os registros do dia escolhido serão apagados. Não dá para desfazer."
            : "Todos os registros diários serão apagados para sempre. Não dá para desfazer."
        }
      >
        <div className="space-y-3">
          {mode === "dia" && (
            <Field label="Dia">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  type="date"
                  value={day}
                  max={today}
                  onChange={(e) => setDay(e.target.value)}
                />
              )}
            </Field>
          )}
          <Checkbox
            checked={withWeight}
            onChange={setWithWeight}
            label={
              mode === "dia"
                ? "Apagar também o peso registrado neste dia"
                : "Apagar também todo o histórico de peso"
            }
            description={
              mode === "todos"
                ? "Sem peso registrado, o app não consegue estimar seu gasto até você pesar de novo."
                : undefined
            }
          />
          {mode === "todos" && (
            <Field label={`Para confirmar, digite ${CONFIRM_WORD}`}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  value={typed}
                  autoCapitalize="characters"
                  autoComplete="off"
                  onChange={(e) => setTyped(e.target.value)}
                />
              )}
            </Field>
          )}
          {err && (
            <p role="alert" className="text-sm font-semibold text-error">
              {err}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" block disabled={busy} onClick={() => setMode(null)}>
              Cancelar
            </Button>
            <Button variant="danger" block disabled={!canRun || busy} onClick={run}>
              {busy ? "Apagando…" : mode === "dia" ? "Apagar o dia" : "Apagar tudo"}
            </Button>
          </div>
        </div>
      </Sheet>
    </Card>
  );
}
