import type { MonitorOrder } from "./types";
import { sceneStatus } from "./selectors";

/**
 * Mundo 2200×1200 dividido en tres ambientes por tabiques:
 *  - Izquierda (x 0–520): mostrador de pedidos por hacer.
 *  - Centro (x 520–1385): sala de producción, la más amplia porque es la que más se carga.
 *  - Derecha (x 1385–2200): cámara con tres vitrinas (heladeras) arriba y, abajo, despacho y entregados.
 */
export const WORLD = { width: 2200, height: 1200 };

export type ZoneId = "pending" | "production" | "stored" | "ready_dispatch" | "delivered";

export const ZONES: Record<ZoneId, { x: number; y: number; label: string; cols: number; cap: number; right: number; bottom: number }> = {
  pending: { x: 70, y: 470, label: "Por hacer", cols: 2, cap: 36, right: 490, bottom: 1160 },
  production: { x: 580, y: 280, label: "Producción", cols: 4, cap: 60, right: 1340, bottom: 1160 },
  stored: { x: 1410, y: 150, label: "Heladeras", cols: 3, cap: 48, right: 2180, bottom: 760 },
  ready_dispatch: { x: 1430, y: 820, label: "Despacho", cols: 2, cap: 24, right: 1760, bottom: 1160 },
  delivered: { x: 1800, y: 820, label: "Entregados hoy", cols: 2, cap: 30, right: 2160, bottom: 1160 },
};

/** Geometría de las vitrinas: cada heladera lista sus pedidos como renglones ordenados por estante. */
export const FRIDGE = {
  w: 250,
  h: 46 + 16 * 30 + 16,
  headH: 46,
  lineH: 30,
  lines: 16,
  xs: [1410, 1670, 1930],
  y: 150,
};

/**
 * - `kind: "crate"`: caja isométrica sobre mesa/piso.
 * - `kind: "shelf"`: renglón dentro de una vitrina (ancho fijo FRIDGE.w - 20).
 * `stagger` alterna la altura de la etiqueta entre columnas vecinas para que no se pisen.
 * `extra` acompaña a los marcadores de desborde ("+N").
 */
export type SlotPos = {
  x: number;
  y: number;
  zone: ZoneId;
  kind: "crate" | "shelf";
  overflow: boolean;
  stagger: boolean;
  extra?: number;
  shelf?: string;
};

// Reparte todas las cajas de la zona dentro del ambiente: si hay muchas, achica el paso
// para que entren sin tapar la sala de al lado.
function isoSpread(zone: ZoneId, index: number, total: number) {
  const z = ZONES[zone];
  const cols = zone === "pending" && total > 12 ? 3 : z.cols;
  const rows = Math.max(1, Math.ceil(total / cols));
  const colStep = Math.min(200, Math.max(128, (z.right - z.x) / Math.max(cols - 1, 1)));
  const rowStep = Math.min(108, Math.max(62, (z.bottom - z.y) / Math.max(rows - 1, 1)));
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: z.x + col * colStep - row * 14,
    y: z.y + row * rowStep + col * 6,
    stagger: col % 2 === 1,
  };
}

/** Índice 0–2 de la heladera dibujada; ids fuera de rango se agrupan en la tercera. */
export function fridgeIndex(order: MonitorOrder, fallback = 0) {
  const raw = order.placements[0]?.fridgeId;
  if (!raw) return fallback % 3;
  const n = parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 1) return fallback % 3;
  return Math.min(3, n) - 1;
}

export function shelfLabel(order: MonitorOrder) {
  const raw = (order.placements[0]?.shelfId ?? "").trim().toUpperCase();
  if (!raw) return "—";
  if (raw === "1") return "A";
  if (raw === "2") return "B";
  if (raw === "3") return "C";
  return raw.slice(0, 2);
}

export function sortForScene(a: MonitorOrder, b: MonitorOrder) {
  const ra = a.rangoHorario.localeCompare(b.rangoHorario);
  if (ra !== 0) return ra;
  return a.id.localeCompare(b.id);
}

function sortForShelf(a: MonitorOrder, b: MonitorOrder) {
  const sa = shelfLabel(a);
  const sb = shelfLabel(b);
  if (sa !== sb) {
    if (sa === "—") return 1;
    if (sb === "—") return -1;
    return sa.localeCompare(sb);
  }
  return sortForScene(a, b);
}

export function assignSlots(orders: MonitorOrder[]) {
  const buckets: Record<ZoneId, MonitorOrder[]> = {
    pending: [],
    production: [],
    stored: [],
    ready_dispatch: [],
    delivered: [],
  };
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    if (order.status === "ready_dispatch") {
      buckets.stored.push(order);
      buckets.ready_dispatch.push(order);
      continue;
    }
    const zone = sceneStatus(order);
    if (zone === "pending" || zone === "production" || zone === "stored" || zone === "delivered") {
      buckets[zone].push(order);
    }
  }

  const positions = new Map<string, SlotPos[]>();
  const push = (id: string, pos: SlotPos) => {
    const arr = positions.get(id) ?? [];
    arr.push(pos);
    positions.set(id, arr);
  };
  const overflowByZone: Partial<Record<ZoneId, number>> = {};

  // Zonas con cajas isométricas.
  (["pending", "production", "ready_dispatch", "delivered"] as ZoneId[]).forEach((zone) => {
    const cap = ZONES[zone].cap;
    const list = [...buckets[zone]].sort(sortForScene);
    const visible = Math.min(list.length, cap);
    list.forEach((order, i) => {
      if (i < cap) {
        push(order.id, { ...isoSpread(zone, i, visible), zone, kind: "crate", overflow: false });
      } else if (i === cap) {
        push(order.id, { ...isoSpread(zone, cap, visible), zone, kind: "crate", overflow: true, extra: list.length - cap });
      }
    });
    const extra = Math.max(0, list.length - cap);
    if (extra) overflowByZone[zone] = extra;
  });

  // Vitrinas: un renglón por pedido, agrupado por heladera y ordenado por estante.
  const perFridge: MonitorOrder[][] = [[], [], []];
  buckets.stored.forEach((order, i) => perFridge[fridgeIndex(order, i)].push(order));
  let storedExtra = 0;
  perFridge.forEach((list, f) => {
    list.sort(sortForShelf);
    list.forEach((order, k) => {
      const base = { x: FRIDGE.xs[f] + 10, y: FRIDGE.y + FRIDGE.headH + k * FRIDGE.lineH, zone: "stored" as const, kind: "shelf" as const, stagger: false, shelf: shelfLabel(order) };
      if (k < FRIDGE.lines) push(order.id, { ...base, overflow: false });
      else if (k === FRIDGE.lines) push(order.id, { ...base, overflow: true, extra: list.length - FRIDGE.lines });
    });
    storedExtra += Math.max(0, list.length - FRIDGE.lines);
  });
  if (storedExtra) overflowByZone.stored = storedExtra;

  return { positions, overflowByZone, buckets, perFridge };
}
