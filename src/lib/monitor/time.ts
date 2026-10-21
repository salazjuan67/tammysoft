import { MONITOR_TZ, RANGO_END_HOUR, RANGO_ORDER } from "./types";

export function nowInTz(date = new Date(), tz = MONITOR_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

export function fechaKey(date = new Date(), tz = MONITOR_TZ) {
  const n = nowInTz(date, tz);
  return `${n.year}-${String(n.month).padStart(2, "0")}-${String(n.day).padStart(2, "0")}`;
}

export function rangoEndOnFecha(fecha: string, rango: string) {
  const hour = RANGO_END_HOUR[rango];
  if (hour == null) return null;
  return new Date(`${fecha}T${String(hour).padStart(2, "0")}:00:00-03:00`);
}

export function currentAndNextRangos(now = new Date()) {
  const { hour } = nowInTz(now);
  const timed = RANGO_ORDER.filter((r) => r !== "SIN_ESPECIFICAR");
  const current = timed.find((r) => hour < RANGO_END_HOUR[r]) ?? timed[timed.length - 1];
  const idx = timed.indexOf(current);
  const next = timed[Math.min(idx + 1, timed.length - 1)];
  return { current, next };
}
