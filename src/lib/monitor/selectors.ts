import type { MonitorFilter, MonitorKpis, MonitorOrder, MonitorStatus } from "./types";

function empty() {
  return { orders: 0, units: 0 };
}

export function sceneStatus(order: MonitorOrder): Exclude<MonitorStatus, "ready_dispatch"> {
  if (order.status === "ready_dispatch") return "stored";
  if (order.status === "unknown") return "pending";
  return order.status;
}

export function matchesFilter(order: MonitorOrder, filter: MonitorFilter, alertOrderIds: Set<string>) {
  if (filter === "all") return order.status !== "cancelled";
  if (filter === "alerts") return alertOrderIds.has(order.id);
  if (filter === "ready_dispatch") return order.status === "ready_dispatch";
  if (filter === "stored") return sceneStatus(order) === "stored";
  return sceneStatus(order) === filter;
}

export function computeKpis(orders: MonitorOrder[], alertCount: number): MonitorKpis {
  const kpis: MonitorKpis = {
    pending: empty(),
    production: empty(),
    stored: empty(),
    ready_dispatch: empty(),
    delivered: empty(),
    alerts: alertCount,
  };
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const zone = sceneStatus(order);
    if (zone === "pending" || zone === "production" || zone === "stored" || zone === "delivered") {
      kpis[zone].orders += 1;
      kpis[zone].units += order.unitsOrdered;
    }
    if (order.status === "ready_dispatch") {
      kpis.ready_dispatch.orders += 1;
      kpis.ready_dispatch.units += order.unitsOrdered;
    }
  }
  return kpis;
}

export function unitsByProduct(orders: MonitorOrder[]) {
  const map = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "cancelled" || order.status === "delivered") continue;
    for (const item of order.items) {
      map.set(item.name, (map.get(item.name) ?? 0) + item.units);
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
}

export function countByRango(orders: MonitorOrder[]) {
  const map = new Map<string, { orders: number; units: number }>();
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const cur = map.get(order.rangoHorario) ?? { orders: 0, units: 0 };
    cur.orders += 1;
    cur.units += order.unitsOrdered;
    map.set(order.rangoHorario, cur);
  }
  return map;
}
