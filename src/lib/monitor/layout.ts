import type { MonitorOrder } from "./types";
import { ZONE_VISIBLE_CAP } from "./types";
import { sceneStatus } from "./selectors";

export const WORLD = { width: 1600, height: 900 };

export type ZoneId = "pending" | "production" | "stored" | "ready_dispatch" | "delivered";

export const ZONES: Record<ZoneId, { x: number; y: number; w: number; h: number; label: string; cols: number }> = {
  pending: { x: 110, y: 500, w: 420, h: 220, label: "Por hacer", cols: 3 },
  production: { x: 540, y: 262, w: 380, h: 200, label: "Producción", cols: 3 },
  stored: { x: 1030, y: 210, w: 500, h: 260, label: "Heladeras", cols: 3 },
  ready_dispatch: { x: 520, y: 572, w: 400, h: 200, label: "Despacho", cols: 3 },
  delivered: { x: 1020, y: 620, w: 460, h: 200, label: "Entregados hoy", cols: 3 },
};

/** `stagger` alterna la altura de la etiqueta entre columnas vecinas para que no se pisen. */
export type SlotPos = { x: number; y: number; zone: ZoneId; overflow: boolean; stagger: boolean };

// Paso horizontal amplio para que las etiquetas (≈150px) no se pisen entre columnas;
// cada fila baja 56px y se corre a la izquierda para seguir la perspectiva isométrica.
function isoSpread(zone: ZoneId, index: number) {
  const z = ZONES[zone];
  const col = index % z.cols;
  const row = Math.floor(index / z.cols);
  return {
    x: z.x + col * 140 - row * 22,
    y: z.y + row * 56 + col * 8,
    stagger: col % 2 === 1,
  };
}

function fridgeSlot(order: MonitorOrder, fallbackIndex: number) {
  const fridgeRaw = order.placements[0]?.fridgeId ?? String((fallbackIndex % 3) + 1);
  const fridgeNum = Math.max(1, Math.min(3, parseInt(fridgeRaw.replace(/\D/g, ""), 10) || ((fallbackIndex % 3) + 1)));
  const shelfRaw = (order.placements[0]?.shelfId ?? "A").toUpperCase();
  const shelf = shelfRaw.startsWith("C") || shelfRaw === "3" ? 2 : shelfRaw.startsWith("B") || shelfRaw === "2" ? 1 : 0;
  // Las heladeras del backdrop están en x=1028/1188/1348, y=188; cada estante cae en y+60+s*48.
  // La caja mide 84×70 y su base está a ~62px del tope, así que la apoyamos sobre la línea del estante.
  const origin = [
    { x: 1044, y: 186 },
    { x: 1204, y: 186 },
    { x: 1364, y: 186 },
  ][fridgeNum - 1];
  return { x: origin.x + (fallbackIndex % 2) * 4, y: origin.y + shelf * 48, stagger: fridgeNum === 2 };
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
    const list = [...buckets[zone]].sort(sortForScene);
    list.forEach((order, i) => {
      const overflow = i >= ZONE_VISIBLE_CAP;
      const idx = overflow ? ZONE_VISIBLE_CAP : i;
      const pos = zone === "stored" && !overflow ? fridgeSlot(order, i) : isoSpread(zone, idx);
      const arr = positions.get(order.id) ?? [];
      if (!overflow || i === ZONE_VISIBLE_CAP) {
        arr.push({ ...pos, zone, overflow: overflow && i === ZONE_VISIBLE_CAP });
      }
      positions.set(order.id, arr);
    });
  });

  const overflowByZone: Partial<Record<ZoneId, number>> = {};
  (Object.keys(buckets) as ZoneId[]).forEach((zone) => {
    const extra = Math.max(0, buckets[zone].length - ZONE_VISIBLE_CAP);
    if (extra) overflowByZone[zone] = extra;
  });

  return { positions, overflowByZone, buckets };
}
