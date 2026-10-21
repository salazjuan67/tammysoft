import type { MonitorLocation, MonitorOrder, MonitorStatus, MonitorTimelineEvent } from "./types";
import { currentAndNextRangos } from "./time";

export type PedidoFuente = {
  id: string;
  estado: string;
  fechaEntrega: string | Date;
  fechaProduccion?: string | Date | null;
  rangoHorario: string;
  notas?: string | null;
  numeroHeladera?: string | null;
  estante?: string | null;
  fechaRetiro?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  cliente?: { nombre?: string | null } | null;
  items?: Array<{
    id?: string;
    cantidad: number;
    producto?: { nombre?: string | null; categoria?: { nombre?: string | null } | null } | null;
  }>;
};

function iso(value?: string | Date | null) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function orderCode(id: string) {
  return `#${id.slice(-4).toUpperCase()}`;
}

/**
 * "Listo en heladera" (Producción) guarda ENTREGADO + número de heladera: el pedido está terminado
 * y esperando que el cliente lo retire, así que se muestra en la heladera. Pasa a entregado cuando
 * se marca el retiro (`fechaRetiro`), o si se marcó ENTREGADO sin heladera.
 */
export function mapStatus(pedido: PedidoFuente): MonitorStatus {
  if (pedido.estado === "PENDIENTE") return "pending";
  if (pedido.estado === "ENTREGADO") return pedido.numeroHeladera && !pedido.fechaRetiro ? "stored" : "delivered";
  if (pedido.estado === "CANCELADO") return "cancelled";
  if (pedido.estado === "EN_PRODUCCION") {
    return pedido.numeroHeladera ? "stored" : "production";
  }
  return "unknown";
}

export function isDispatchCandidate(pedido: PedidoFuente, now = new Date()) {
  if (mapStatus(pedido) !== "stored") return false;
  const { current, next } = currentAndNextRangos(now);
  return pedido.rangoHorario === current || pedido.rangoHorario === next;
}

export function adaptOrder(pedido: PedidoFuente, now = new Date()): MonitorOrder {
  const items = (pedido.items ?? []).map((item) => ({
    id: item.id,
    name: item.producto?.nombre ?? "Producto",
    units: item.cantidad,
    category: item.producto?.categoria?.nombre ?? undefined,
  }));
  const unitsOrdered = items.reduce((s, i) => s + i.units, 0);
  const status = mapStatus(pedido);
  const placements = pedido.numeroHeladera
    ? [{ fridgeId: String(pedido.numeroHeladera), shelfId: pedido.estante ?? undefined, units: unitsOrdered }]
    : [];

  const timeline: MonitorTimelineEvent[] = [];
  const createdAt = iso(pedido.createdAt);
  const productionStartedAt = iso(pedido.fechaProduccion);
  const updatedAt = iso(pedido.updatedAt);
  const pickedUpAt = iso(pedido.fechaRetiro);
  if (createdAt) timeline.push({ at: createdAt, label: "Pedido creado", source: "createdAt" });
  if (productionStartedAt) timeline.push({ at: productionStartedAt, label: "Pasó a producción", source: "fechaProduccion" });
  if (pedido.estado === "ENTREGADO" && updatedAt && !pickedUpAt) {
    timeline.push({ at: updatedAt, label: status === "stored" ? "Listo en heladera" : "Marcado entregado", source: "updatedAt" });
  }
  if (pedido.estado === "ENTREGADO" && pickedUpAt) {
    timeline.push({ at: pickedUpAt, label: "Retirado por el cliente", source: "fechaRetiro" });
  }

  const endCustomer = pedido.notas?.trim() || undefined;

  return {
    id: pedido.id,
    code: orderCode(pedido.id),
    customerName: pedido.cliente?.nombre ?? "Cliente",
    endCustomerName: endCustomer,
    status: isDispatchCandidate(pedido, now) ? "ready_dispatch" : status,
    rawEstado: pedido.estado,
    rangoHorario: pedido.rangoHorario,
    deliveryAt: iso(pedido.fechaEntrega),
    createdAt,
    productionStartedAt,
    deliveredAt: status === "delivered" ? pickedUpAt ?? updatedAt : undefined,
    unitsOrdered,
    items,
    placements,
    notes: endCustomer,
    updatedAt,
    timeline,
  };
}

export function discoverLocations(pedidos: PedidoFuente[]): MonitorLocation[] {
  const map = new Map<string, Set<string>>();
  for (const p of pedidos) {
    if (!p.numeroHeladera) continue;
    if (!map.has(p.numeroHeladera)) map.set(p.numeroHeladera, new Set());
    if (p.estante) map.get(p.numeroHeladera)!.add(p.estante);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true }))
    .map(([id, shelves]) => ({
      id,
      name: `Heladera ${id}`,
      shelves: [...shelves].sort().map((label) => ({ id: label, label })),
    }));
}
