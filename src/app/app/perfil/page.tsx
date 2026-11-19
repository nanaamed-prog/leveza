"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  ChartColumn,
  ChevronRight,
  LogOut,
  Settings,
  ShieldCheck,
  Target,
  Timer,
  Baby,
  ListChecks,
  Moon,
  Droplets,
  Waves,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChoiceGroup, Field, Input, Select } from "@/components/ui/form";
import { useAppData } from "@/lib/data/provider";
import { ACTIVITY_LEVEL_LABELS, type ActivityLevel } from "@/lib/calc/met";
import type { EquationParameter } from "@/lib/calc/bmr";
import { useRouter } from "next/navigation";

const TZS = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Cuiaba",
  "America/Rio_Branco",
  "America/Noronha",
  "Europe/Lisbon",
  "America/New_York",
  "UTC",
];

export default function ProfilePage() {
  const router = useRouter();
  const { profile, store, refresh, signOut, eligibility, isDemo } = useAppData();
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(() => ({
    name: profile?.display_name ?? "",
    height: String(profile?.height_cm ?? ""),
    activity: (profile?.activity_level ?? "leve") as ActivityLevel,
    parameter: (profile?.equation_parameter ?? "nao_informado") as EquationParameter,
    tz: profile?.timezone ?? "America/Sao_Paulo",
    week: String(profile?.week_starts_on ?? 1),
  }));
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (!store || !profile) return;
    const h = Number(v.height.replace(",", "."));
    if (!v.name.trim() || !(h >= 100 && h <= 250))
      return setMsg("Confira nome e altura (100–250 cm).");
    const { id: _i, user_id: _u, created_at: _c, updated_at: _up, ...rest } = profile;
    void _i;
    void _u;
    void _c;
    void _up;
    await store.upsertSingle("profiles", {
      ...rest,
      display_name: v.name.trim(),
      height_cm: h,
      activity_level: v.activity,
      equation_parameter: v.parameter,
      timezone: v.tz,
      week_starts_on: v.week === "0" ? 0 : 1,
    });
    setEdit(false);
    setMsg("Perfil atualizado.");
    refresh();
  }

  const links = [
    { href: "/app/plano", label: "Meu plano e objetivos", icon: Target },
    { href: "/app/perfil/triagem", label: "Triagem de saúde", icon: ShieldCheck },
    eligibility.mode === "lactante"
      ? { href: "/app/lactante", label: "Modo Lactante", icon: Baby }
      : { href: "/app/jejum", label: "Jejum", icon: Timer },
    { href: "/app/habitos", label: "Plano 5+2", icon: ListChecks },
    { href: "/app/sono", label: "Sono", icon: Moon },
    { href: "/app/agua", label: "Água", icon: Droplets },
    { href: "/app/intestino", label: "Meu intestino", icon: Waves },
    { href: "/app/receitas", label: "Receitas", icon: BookOpen },
    { href: "/app/relatorios", label: "Relatórios", icon: ChartColumn },
    { href: "/app/configuracoes", label: "Configurações e privacidade", icon: Settings },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Perfil" />
      <Card>
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-full bg-sage-soft font-display text-xl font-bold text-forest">
            {profile?.display_name?.[0]?.toUpperCase()}
          </span>
          <div>
            <p className="font-display text-lg font-semibold">{profile?.display_name}</p>
            <p className="text-sm text-muted">
              {isDemo ? "Modo demonstração" : "Conta Leveza"} · {profile?.height_cm} cm
            </p>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setEdit(!edit)}>
            {edit ? "Fechar" : "Editar"}
          </Button>
        </div>
        {edit && (
          <div className="mt-4 space-y-3">
            <Field label="Nome">
              {({ id }) => (
                <Input
                  id={id}
                  value={v.name}
                  onChange={(e) => setV({ ...v, name: e.target.value })}
                />
              )}
            </Field>
            <Field label="Altura (cm)">
              {({ id }) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  value={v.height}
                  onChange={(e) => setV({ ...v, height: e.target.value })}
                />
              )}
            </Field>
            <Field label="Nível habitual de atividade">
              {({ id }) => (
                <Select
                  id={id}
                  value={v.activity}
                  onChange={(e) => setV({ ...v, activity: e.target.value as ActivityLevel })}
                >
                  {(Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]).map((k) => (
                    <option key={k} value={k}>
                      {ACTIVITY_LEVEL_LABELS[k]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <ChoiceGroup
              legend="Parâmetro da equação de metabolismo"
              value={v.parameter}
              onChange={(x) => setV({ ...v, parameter: x })}
              options={[
                { value: "feminino", label: "Feminino" },
                { value: "masculino", label: "Masculino" },
                { value: "nao_informado", label: "Prefiro não informar (faixa)" },
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Fuso horário">
                {({ id }) => (
                  <Select id={id} value={v.tz} onChange={(e) => setV({ ...v, tz: e.target.value })}>
                    {[...new Set([v.tz, ...TZS])].map((t) => (
                      <option key={t} value={t}>
                        {t.replace("_", " ")}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Semana começa">
                {({ id }) => (
                  <Select
                    id={id}
                    value={v.week}
                    onChange={(e) => setV({ ...v, week: e.target.value })}
                  >
                    <option value="1">Segunda-feira</option>
                    <option value="0">Domingo</option>
                  </Select>
                )}
              </Field>
            </div>
            <Button block onClick={save}>
              Salvar
            </Button>
          </div>
        )}
        {msg && (
          <p role="status" className="mt-2 text-sm text-forest">
            {msg}
          </p>
        )}
      </Card>

      <Card className="p-0">
        <CardTitle className="sr-only">Atalhos</CardTitle>
        <ul className="divide-y divide-line">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-14 items-center gap-3 px-4 font-semibold text-ink"
              >
                <Icon className="size-5 text-forest" aria-hidden /> {label}
                <ChevronRight className="ml-auto size-4 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Button
        variant="outline"
        block
        onClick={async () => {
          await signOut();
          router.replace("/");
        }}
      >
        <LogOut /> Sair
      </Button>
      <p className="text-center text-xs text-muted">
        Leveza não é dispositivo médico e não substitui acompanhamento profissional.
      </p>
    </div>
  );
}
