import type { DataStore } from "./store";
import type { Profile, ScreeningRow } from "./types";
import { CONSENT_VERSION } from "./types";
import { evaluateEligibility } from "@/lib/calc/eligibility";

/**
 * Desativa o Modo Lactante registrando uma NOVA triagem com "não estou amamentando"
 * (as demais respostas são mantidas). As regras de segurança continuam valendo: jejum e
 * déficit só voltam se o restante da triagem permitir.
 */
export async function leaveLactationMode(
  store: DataStore,
  screening: ScreeningRow | null,
  profile: Profile | null,
) {
  if (!screening || !profile)
    throw new Error("Triagem não encontrada. Revise a triagem em Perfil.");
  const {
    id: _i,
    user_id: _u,
    created_at: _c,
    updated_at: _up,
    consent_version: _cv,
    ...answers
  } = screening;
  void _i;
  void _u;
  void _c;
  void _up;
  void _cv;
  const next = { ...answers, breastfeeding: "nao" as const };
  await store.insert("health_screenings", { ...next, consent_version: CONSENT_VERSION });
  const mode = evaluateEligibility(next).mode;
  const { id: _pi, user_id: _pu, created_at: _pc, updated_at: _pup, ...p } = profile;
  void _pi;
  void _pu;
  void _pc;
  void _pup;
  await store.upsertSingle("profiles", { ...p, mode });
  return mode;
}
