/**
 * Datas: tudo é armazenado em UTC (ISO 8601) e exibido no fuso escolhido pelo usuário.
 * Sem dependências: usa Intl para descobrir o deslocamento do fuso em cada instante (respeita horário de verão).
 */

export const DEFAULT_TZ = "America/Sao_Paulo";

function partsInTz(ms: number, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(new Date(ms))) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  return p as {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
}

/** Deslocamento do fuso (ms) no instante dado: horaLocal − UTC. */
export function tzOffsetMs(ms: number, tz: string): number {
  const p = partsInTz(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Converte data/hora local (no fuso) para epoch ms UTC. */
export function zonedToUtc(
  y: number,
  m: number,
  d: number,
  h: number,
  min: number,
  tz: string,
): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  let ms = guess - tzOffsetMs(guess, tz);
  ms = guess - tzOffsetMs(ms, tz);
  return ms;
}

/** "YYYY-MM-DD" do instante no fuso. */
export function localDateKey(ms: number, tz: string): string {
  const p = partsInTz(ms, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Início e fim (exclusivo) do dia local em epoch ms UTC. Dias com horário de verão podem ter 23 h ou 25 h. */
export function dayRange(dateKey: string, tz: string): { start: number; end: number } {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  const start = zonedToUtc(y, m, d, 0, 0, tz);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const end = zonedToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    0,
    0,
    tz,
  );
  return { start, end };
}

export function addDays(dateKey: string, n: number): string {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Início da semana (0 = domingo, 1 = segunda — padrão). */
export function startOfWeek(dateKey: string, weekStartsOn = 1): string {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const diff = (dow - weekStartsOn + 7) % 7;
  return addDays(dateKey, -diff);
}

export function formatTime(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(ms);
}

export function formatDateLong(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(ms);
}

export function formatDateShort(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  }).format(Date.UTC(y, m - 1, d));
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/** Valor para <input type="datetime-local"> no fuso. */
export function toLocalInput(ms: number, tz: string): string {
  const p = partsInTz(ms, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function fromLocalInput(value: string, tz: string): number {
  const [date, time] = value.split("T") as [string, string];
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [h, min] = (time ?? "00:00").split(":").map(Number) as [number, number];
  return zonedToUtc(y, m, d, h, min, tz);
}

export function greeting(ms: number, tz: string): string {
  const h = partsInTz(ms, tz).hour;
  if (h < 5) return "Boa noite";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
