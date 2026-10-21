import type { MonitorOrder } from "./types";
import { sceneStatus } from "./selectors";

/**
 * El obrador se arma según la pantalla y la carga del día:
 *  - El alto del mundo es fijo (1200) y el ancho sigue la proporción del contenedor,
 *    así la escena ocupa todo el ancho y todo el alto sin franjas vacías.
 *  - Tres ambientes separados por tabiques: por hacer, producción y cámara fría
 *    (heladeras arriba, despacho y entregados abajo). Cada uno tiene un ancho mínimo
 *    y el resto se reparte en proporción a la cantidad de pedidos que tiene.
 */
export const WORLD_HEIGHT = 1200;
export const WALL_Y = 262;
const FLOOR_BOTTOM = 1060;

export type ZoneId = "pending" | "production" | "stored" | "ready_dispatch" | "delivered";

export const ZONE_LABEL: Record<ZoneId, string> = {
  pending: "Por hacer",
  production: "Producción",
  stored: "Heladeras",
  ready_dispatch: "Despacho",
  delivered: "Entregados hoy",
};

export type ZoneBox = { x: number; y: number; right: number; bottom: number };

export type SceneLayout = {
  width: number;
  height: number;
  /** Límites x de cada ambiente: [inicio, fin]. */
  rooms: { pending: [number, number]; production: [number, number]; cold: [number, number] };
  zones: Record<Exclude<ZoneId, "stored">, ZoneBox>;
  tags: Record<ZoneId, { x: number; y: number }>;
  fridge: { xs: number[]; y: number; w: number; h: number; headH: number; lineH: number; lines: number };
  /** Separación vertical entre las heladeras y las mesas de despacho / entregados. */
  coldSplitX: number;
  coldFloorY: number;
};

/**
 * - `kind: "crate"`: caja isométrica sobre mesa/piso.
 * - `kind: "shelf"`: renglón dentro de una vitrina (`w` = ancho del renglón).
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
  w?: number;
};

const ROOM_MIN = { pending: 420, production: 640, cold: 860 };
const CRATE_COL_MIN = 168;
const CRATE_COL_MAX = 260;
const CRATE_ROW_MIN = 64;
const CRATE_ROW_MAX = 280;

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

function bucketize(orders: MonitorOrder[]) {
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
  return buckets;
}

/** Reparte `extra` entre ambientes en proporción a su carga (con piso para que nadie quede en cero). */
function share(extra: number, weights: number[]) {
  const total = weights.reduce((s, w) => s + w, 0);
  return weights.map((w) => (extra * w) / total);
}

export function computeLayout(
  buckets: Record<ZoneId, MonitorOrder[]>,
  aspect: number,
  perFridgeMax: number,
  focusProduction = false,
): SceneLayout {
  const height = WORLD_HEIGHT;
  const minTotal = ROOM_MIN.pending + ROOM_MIN.production + ROOM_MIN.cold;
  const width = Math.round(Math.min(5200, Math.max(minTotal, height * (Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9))));

  let a: number;
  let b: number;
  if (focusProduction) {
    // Vista Producción: la sala ocupa casi todo el mundo y los otros ambientes quedan como bordes.
    a = 160;
    b = width - 160;
  } else {
    const nPending = buckets.pending.length;
    const nProd = buckets.production.length;
    const nCold = Math.max(buckets.stored.length, buckets.ready_dispatch.length + buckets.delivered.length);
    const [ePending, eProd] = share(width - minTotal, [0.6 + nPending, 1 + nProd, 0.8 + nCold]);
    a = ROOM_MIN.pending + ePending;
    b = a + ROOM_MIN.production + eProd;
  }
  const coldW = width - b;

  const fridgeGap = 20;
  const fridgeW = Math.min(440, Math.max(230, (coldW - 70 - fridgeGap * 2) / 3));
  const fridgeStart = b + Math.max(36, (coldW - (fridgeW * 3 + fridgeGap * 2)) / 2);
  const lineH = 30;
  const lines = Math.min(16, Math.max(6, perFridgeMax));
  const fridgeY = 150;
  const headH = 46;
  const fridgeH = headH + lines * lineH + 16;
  const coldFloorY = fridgeY + fridgeH + 40;

  const nDispatch = buckets.ready_dispatch.length;
  const nDelivered = buckets.delivered.length;
  const dispatchShare = Math.min(0.62, Math.max(0.38, (1 + nDispatch) / (2 + nDispatch + nDelivered)));
  const coldSplitX = b + coldW * dispatchShare;
  const lowerY = coldFloorY + 140;

  return {
    width,
    height,
    rooms: { pending: [0, a], production: [a, b], cold: [b, width] },
    zones: {
      pending: { x: 60, y: 540, right: a - 120, bottom: FLOOR_BOTTOM },
      production: { x: a + 70, y: 330, right: b - 150, bottom: FLOOR_BOTTOM },
      ready_dispatch: { x: b + 50, y: lowerY, right: coldSplitX - 130, bottom: FLOOR_BOTTOM },
      delivered: { x: coldSplitX + 40, y: lowerY, right: width - 130, bottom: FLOOR_BOTTOM },
    },
    tags: {
      pending: { x: 60, y: 410 },
      production: { x: a + 60, y: 196 },
      stored: { x: fridgeStart, y: 96 },
      ready_dispatch: { x: b + 40, y: coldFloorY },
      delivered: { x: coldSplitX + 30, y: coldFloorY },
    },
    fridge: {
      xs: [0, 1, 2].map((i) => fridgeStart + i * (fridgeW + fridgeGap)),
      y: fridgeY,
      w: fridgeW,
      h: fridgeH,
      headH,
      lineH,
      lines,
    },
    coldSplitX,
    coldFloorY,
  };
}

/**
 * Grilla de cajas que ocupa todo el ambiente: con pocos pedidos se separan para usar el ancho,
 * con muchos se compacta hasta el mínimo legible y recién ahí aparece el "+N".
 */
function crateGrid(box: ZoneBox, total: number) {
  const usableW = Math.max(0, box.right - box.x);
  const usableH = Math.max(0, box.bottom - box.y);
  const maxCols = Math.max(1, Math.floor(usableW / CRATE_COL_MIN) + 1);
  const maxRows = Math.max(1, Math.floor(usableH / CRATE_ROW_MIN) + 1);
  const cap = maxCols * maxRows;
  const shown = Math.min(total, cap);
  // Columnas y filas en la misma proporción que el ambiente, para repartir las cajas en toda la sala.
  const ratio = usableW / 200 / Math.max(1, usableH / 150);
  const balanced = Math.ceil(Math.sqrt(Math.max(1, shown) * ratio));
  const cols = Math.max(1, Math.min(maxCols, Math.max(balanced, Math.ceil(shown / maxRows))));
  const rows = Math.max(1, Math.ceil(shown / cols));
  const colStep = cols > 1 ? Math.min(CRATE_COL_MAX, usableW / (cols - 1)) : 0;
  const rowStep = rows > 1 ? Math.min(CRATE_ROW_MAX, Math.max(CRATE_ROW_MIN, usableH / (rows - 1))) : 0;
  const offsetX = cols > 1 ? Math.max(0, (usableW - colStep * (cols - 1)) / 2) : Math.min(usableW / 2, 120);
  return {
    cap,
    at(index: number) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        x: box.x + offsetX + col * colStep - row * 14,
        y: box.y + row * rowStep + col * 6,
        stagger: col % 2 === 1,
      };
    },
  };
}

export function assignSlots(orders: MonitorOrder[], aspect = 16 / 9, focusProduction = false) {
  const buckets = bucketize(orders);

  const perFridge: MonitorOrder[][] = [[], [], []];
  buckets.stored.forEach((order, i) => perFridge[fridgeIndex(order, i)].push(order));
  perFridge.forEach((list) => list.sort(sortForShelf));
  const perFridgeMax = Math.max(0, ...perFridge.map((l) => l.length));

  const layout = computeLayout(buckets, aspect, perFridgeMax, focusProduction);

  const positions = new Map<string, SlotPos[]>();
  const push = (id: string, pos: SlotPos) => {
    const arr = positions.get(id) ?? [];
    arr.push(pos);
    positions.set(id, arr);
  };
  const overflowByZone: Partial<Record<ZoneId, number>> = {};

  (["pending", "production", "ready_dispatch", "delivered"] as const).forEach((zone) => {
    const list = [...buckets[zone]].sort(sortForScene);
    const grid = crateGrid(layout.zones[zone], list.length);
    // Si no entran todos, la última celda queda para el "+N".
    const visible = list.length > grid.cap ? grid.cap - 1 : list.length;
    list.forEach((order, i) => {
      if (i < visible) {
        push(order.id, { ...grid.at(i), zone, kind: "crate", overflow: false });
      } else if (i === visible) {
        push(order.id, { ...grid.at(visible), zone, kind: "crate", overflow: true, extra: list.length - visible });
      }
    });
    if (list.length > visible) overflowByZone[zone] = list.length - visible;
  });

  const { fridge } = layout;
  let storedExtra = 0;
  perFridge.forEach((list, f) => {
    const visible = list.length > fridge.lines ? fridge.lines - 1 : list.length;
    list.forEach((order, k) => {
      const base = {
        x: fridge.xs[f] + 10,
        y: fridge.y + fridge.headH + k * fridge.lineH,
        zone: "stored" as const,
        kind: "shelf" as const,
        stagger: false,
        shelf: shelfLabel(order),
        w: fridge.w - 20,
      };
      if (k < visible) push(order.id, { ...base, overflow: false });
      else if (k === visible) push(order.id, { ...base, overflow: true, extra: list.length - visible });
    });
    storedExtra += list.length - visible;
  });
  if (storedExtra) overflowByZone.stored = storedExtra;

  return { positions, overflowByZone, buckets, perFridge, layout };
}
