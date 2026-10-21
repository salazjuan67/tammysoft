import { adaptOrder, discoverLocations, type PedidoFuente } from "./adapter";
import { buildAlerts } from "./alerts";
import { computeKpis } from "./selectors";
import { MONITOR_TZ, type MonitorSnapshot } from "./types";

export function buildSnapshot(pedidos: PedidoFuente[], fecha: string, now = new Date()): MonitorSnapshot {
  const orders = pedidos.map((p) => adaptOrder(p, now));
  const alerts = buildAlerts(orders, fecha, now);
  return {
    fecha,
    orders,
    locations: discoverLocations(pedidos),
    kpis: computeKpis(orders, alerts.length),
    alerts,
    dispatchHeuristic: "Pedidos en heladera cuyo rango de entrega es el actual o el siguiente. No es un estado persistido.",
    timezone: MONITOR_TZ,
    serverTime: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
