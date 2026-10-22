import type { MonitorAlert, MonitorOrder } from "./types";
import { ALERT_SOON_MINUTES, PRODUCTION_DELAY_HOURS } from "./types";
import { rangoEndOnFecha } from "./time";

export function buildAlerts(orders: MonitorOrder[], fecha: string, now = new Date()): MonitorAlert[] {
  const alerts: MonitorAlert[] = [];

  for (const order of orders) {
    if (order.rawEstado === "CANCELADO" || order.status === "delivered") continue;

    // Un pedido ya listo en heladera no puede "vencer": falta el retiro, que el sistema no registra.
    const ready = order.status === "stored";
    const end = ready ? undefined : rangoEndOnFecha(fecha, order.rangoHorario);
    if (end) {
      const minutes = (end.getTime() - now.getTime()) / 60000;
      if (minutes < 0) {
        alerts.push({
          id: `${order.id}-overdue`,
          kind: "delivery_overdue",
          severity: "critical",
          orderId: order.id,
          title: "Entrega vencida",
          detail: `${order.code} · ${order.customerName}`,
        });
      } else if (minutes <= ALERT_SOON_MINUTES) {
        alerts.push({
          id: `${order.id}-soon`,
          kind: "delivery_soon",
          severity: "warning",
          orderId: order.id,
          title: `Entrega en ${Math.max(1, Math.round(minutes))} min`,
          detail: `${order.code} · ${order.endCustomerName ?? order.customerName}`,
        });
      }
    }

    if (order.status === "production" && order.productionStartedAt) {
      const started = new Date(order.productionStartedAt).getTime();
      const hours = (now.getTime() - started) / 3600000;
      if (hours >= PRODUCTION_DELAY_HOURS) {
        alerts.push({
          id: `${order.id}-delayed`,
          kind: "production_delayed",
          severity: "warning",
          orderId: order.id,
          title: `En producción hace ${Math.floor(hours)} h`,
          detail: `${order.code} · ${order.endCustomerName ?? order.customerName}`,
        });
      }
    }

    if (order.rawEstado === "EN_PRODUCCION" && order.placements.length === 0 && order.status !== "production") {
      alerts.push({
        id: `${order.id}-noloc`,
        kind: "missing_location",
        severity: "warning",
        orderId: order.id,
        title: "Sin ubicación de heladera",
        detail: `${order.code} · ${order.customerName}`,
      });
    }
  }

  const seen = new Set<string>();
  return alerts.filter((a) => {
    if (seen.has(a.orderId + a.kind)) return false;
    seen.add(a.orderId + a.kind);
    return true;
  });
}
