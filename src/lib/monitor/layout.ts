import type { MonitorOrder } from "./types";
import { ZONE_VISIBLE_CAP } from "./types";
import { sceneStatus } from "./selectors";

/**
 * Mundo 2200×1100 dividido en tres ambientes por tabiques:
 *  - Izquierda (x 0–520): mostrador de pedidos por hacer.
 *  - Centro (x 520–1385): sala de producción, la más amplia porque es la que más se carga.
 *  - Derecha (x 1385–2200): cámara con heladeras arriba, despacho y entregados abajo.
 */
export const WORLD = { width: 2200, height: 1100 };

export type ZoneId = "pending" | "production" | "stored" | "ready_dispatch" | "delivered";

export const ZONES: Record<ZoneId, { x: number; y: number; label: string; cols: number; cap: number }> = {
  pending: { x: 110, y: 600, label: "Por hacer", cols: 2, cap: ZONE_VISIBLE_CAP },
  production: { x: 620, y: 330, label: "Producción", cols: 4, cap: 16 },
  stored: { x: 1440, y: 210, label: "Heladeras", cols: 3, cap: ZONE_VISIBLE_CAP },
  ready_dispatch: { x: 1450, y: 660, label: "Despacho", cols: 2, cap: ZONE_VISIBLE_CAP },
  delivered: { x: 1820, y: 660, label: "Entregados hoy", cols: 2, cap: ZONE_VISIBLE_CAP },
};

/** `stagger` alterna la altura de la etiqueta entre columnas vecinas para que no se pisen. */
export type SlotPos = { x: number; y: number; zone: ZoneId; overflow: boolean; stagger: boolean };

// Paso horizontal de 200 (las etiquetas escaladas miden ≈240px, pero las columnas vecinas
// alternan altura); cada fila baja 84px y se corre a la izquierda siguiendo la perspectiva.
function isoSpread(zone: ZoneId, index: number) {
  const z = ZONES[zone];
  const col = index % z.cols;
  const row = Math.floor(index / z.cols);
  return {
    x: z.x + col * 200 - row * 22,
    y: z.y + row * 84 + col * 8,
    stagger: col % 2 === 1,
  };
}

function fridgeSlot(order: MonitorOrder, fallbackIndex: number) {
  const fridgeRaw = order.placements[0]?.fridgeId ?? String((fallbackIndex % 3) + 1);
  const fridgeNum = Math.max(1, Math.min(3, parseInt(fridgeRaw.replace(/\D/g, ""), 10) || ((fallbackIndex % 3) + 1)));
  const shelfRaw = (order.placements[0]?.shelfId ?? "A").toUpperCase();
  const shelf = shelfRaw.startsWith("C") || shelfRaw === "3" ? 2 : shelfRaw.startsWith("B") || shelfRaw === "2" ? 1 : 0;
  // Las heladeras del backdrop están en x=1440/1700/1960 (260 de paso, para que las etiquetas
  // no se pisen), y=188; cada estante cae en y+60+s*48. La caja mide 84×70 y su base está a
  // ~62px del tope, así que la apoyamos sobre la línea del estante.
  const origin = [
    { x: 1456, y: 186 },
    { x: 1716, y: 186 },
    { x: 1976, y: 186 },
  ][fridgeNum - 1];
  return { x: origin.x + (fallbackIndex % 2) * 4, y: origin.y + shelf * 48, stagger: false };
}

export function sortForScene(a: MonitorOrder, b: MonitorOrder) {
  const ra = a.rangoHorario.localeCompare(b.rangoHorario);
  if (ra !== 0) return ra;
  return a.id.localeCompare(b.id);
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
  (Object.keys(buckets) as ZoneId[]).forEach((zone) => {
    const cap = ZONES[zone].cap;
    const list = [...buckets[zone]].sort(sortForScene);
    list.forEach((order, i) => {
      const overflow = i >= cap;
      const idx = overflow ? cap : i;
      const pos = zone === "stored" && !overflow ? fridgeSlot(order, i) : isoSpread(zone, idx);
      const arr = positions.get(order.id) ?? [];
      if (!overflow || i === cap) {
        arr.push({ ...pos, zone, overflow: overflow && i === cap });
      }
      positions.set(order.id, arr);
    });
  });

  const overflowByZone: Partial<Record<ZoneId, number>> = {};
  (Object.keys(buckets) as ZoneId[]).forEach((zone) => {
    const extra = Math.max(0, buckets[zone].length - ZONES[zone].cap);
    if (extra) overflowByZone[zone] = extra;
  });

  return { positions, overflowByZone, buckets };
}
