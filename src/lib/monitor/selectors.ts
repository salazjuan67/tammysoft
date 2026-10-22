import type { MonitorFilter, MonitorKpis, MonitorOrder, MonitorStatus } from "./types";
import { RANGO_ORDER } from "./types";

function empty() {
  return { orders: 0, units: 0 };
}

export function sceneStatus(order: MonitorOrder): MonitorStatus {
  if (order.status === "unknown") return "pending";
  return order.status;
}

export function matchesFilter(order: MonitorOrder, filter: MonitorFilter, alertOrderIds: Set<string>) {
  if (filter === "all") return order.status !== "cancelled";
  if (filter === "alerts") return alertOrderIds.has(order.id);
  return sceneStatus(order) === filter;
}

export function computeKpis(orders: MonitorOrder[], alertCount: number): MonitorKpis {
  const kpis: MonitorKpis = {
    pending: empty(),
    production: empty(),
    stored: empty(),
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
  }
  return kpis;
}

/** Potes que todavía hay que producir (por hacer + en producción), por producto, de mayor a menor. */
export function unitsToProduce(orders: MonitorOrder[]) {
  const map = new Map<string, { name: string; pending: number; production: number; total: number }>();
  for (const order of orders) {
    const zone = order.status === "production" ? "production" : order.status === "pending" || order.status === "unknown" ? "pending" : null;
    if (!zone) continue;
    for (const item of order.items) {
      const cur = map.get(item.name) ?? { name: item.name, pending: 0, production: 0, total: 0 };
      cur[zone] += item.units;
      cur.total += item.units;
      map.set(item.name, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "es"));
}

/** Potes del día por etapa: lo que falta hacer, lo listo en heladera y lo ya retirado. */
export function dayProgress(orders: MonitorOrder[]) {
  const p = { total: 0, pending: 0, production: 0, ready: 0, delivered: 0 };
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const zone = sceneStatus(order);
    const u = order.unitsOrdered;
    p.total += u;
    if (zone === "delivered") p.delivered += u;
    else if (zone === "stored") p.ready += u;
    else if (zone === "production") p.production += u;
    else p.pending += u;
  }
  return p;
}

export type RangoBucket = { rango: string; orders: number; units: number; delivered: number; ready: number; todo: number };

/** Pedidos por rango horario (en el orden del día), separados en retirados, listos y por hacer. */
export function rangoBuckets(orders: MonitorOrder[]): RangoBucket[] {
  const map = new Map<string, RangoBucket>();
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const cur = map.get(order.rangoHorario) ?? { rango: order.rangoHorario, orders: 0, units: 0, delivered: 0, ready: 0, todo: 0 };
    const zone = sceneStatus(order);
    cur.orders += 1;
    cur.units += order.unitsOrdered;
    if (zone === "delivered") cur.delivered += 1;
    else if (zone === "stored") cur.ready += 1;
    else cur.todo += 1;
    map.set(order.rangoHorario, cur);
  }
  return RANGO_ORDER.filter((r) => map.has(r)).map((r) => map.get(r)!);
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
