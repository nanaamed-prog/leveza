/**
 * Sono: duração efetiva = (acordar − deitar) − minutos acordado durante a noite.
 * Regularidade: desvio-padrão circular do horário de deitar (em minutos) — menor = mais regular.
 * Relações com fome/disposição são exploratórias; o app nunca afirma causalidade.
 */

export interface SleepRecord {
  start: number;
  end: number;
  awakeMinutes: number;
  quality?: number | null; // 1–5
}

export function effectiveSleepMinutes(r: SleepRecord): number {
  const inBed = (r.end - r.start) / 60_000;
  if (!(inBed > 0)) return 0;
  return Math.max(0, inBed - Math.max(0, r.awakeMinutes || 0));
}

export function validateSleep(r: SleepRecord): string | null {
  const inBed = (r.end - r.start) / 60_000;
  if (!(inBed > 0)) return "O horário de acordar precisa ser depois do horário de deitar.";
  if (inBed > 20 * 60) return "Período maior que 20 horas. Confira os horários.";
  if ((r.awakeMinutes || 0) > inBed)
    return "O tempo acordado não pode ser maior que o tempo na cama.";
  return null;
}

export function averageSleep(records: SleepRecord[]): number | null {
  if (records.length === 0) return null;
  return records.reduce((s, r) => s + effectiveSleepMinutes(r), 0) / records.length;
}

/** Minuto do dia (0–1439) do início do sono, no fuso informado via offset função. */
export function bedtimeRegularity(bedtimeMinutesOfDay: number[]): number | null {
  if (bedtimeMinutesOfDay.length < 2) return null;
  const angles = bedtimeMinutesOfDay.map((m) => (m / 1440) * 2 * Math.PI);
  const C = angles.reduce((s, a) => s + Math.cos(a), 0) / angles.length;
  const S = angles.reduce((s, a) => s + Math.sin(a), 0) / angles.length;
  const R = Math.min(1, Math.sqrt(C * C + S * S));
  if (R <= 0) return 720;
  const sdRad = Math.sqrt(-2 * Math.log(R));
  return (sdRad / (2 * Math.PI)) * 1440;
}
