import type { MonitorOrder } from "./types";
import { ALERT_SOON_MINUTES } from "./types";
import { rangoEndOnFecha } from "./time";

export type Urgency = "none" | "soon" | "late";

/** Desde cuántos minutos antes del fin del rango una caja que todavía no está lista se marca en ámbar. */
export const URGENCY_SOON_MINUTES = 120;

/**
 * Solo cuenta para pedidos que todavía no están listos (por hacer o en producción), igual que las alertas:
 * ámbar si faltan ≤ 2 h para el fin del rango, rojo si faltan ≤ 30 min o ya venció.
 */
export function urgencyOf(order: MonitorOrder, fecha: string, now: Date): Urgency {
  if (order.status !== "pending" && order.status !== "production" && order.status !== "unknown") return "none";
  const end = rangoEndOnFecha(fecha, order.rangoHorario);
  if (!end) return "none";
  const minutes = (end.getTime() - now.getTime()) / 60000;
  if (minutes <= ALERT_SOON_MINUTES) return "late";
  if (minutes <= URGENCY_SOON_MINUTES) return "soon";
  return "none";
}
