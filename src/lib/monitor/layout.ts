import type { MonitorOrder, MonitorStatus } from "./types";
import { ZONE_VISIBLE_CAP } from "./types";
import { sceneStatus } from "./selectors";

export const WORLD = { width: 1600, height: 900 };

export type ZoneId = "pending" | "production" | "stored" | "ready_dispatch" | "delivered";

export const ZONES: Record<ZoneId, { x: number; y: number; w: number; h: number; label: string; cols: number }> = {
  pending: { x: 70, y: 430, w: 430, h: 340, label: "Por hacer", cols: 4 },
  production: { x: 520, y: 150, w: 430, h: 300, label: "Producción", cols: 4 },
  stored: { x: 990, y: 140, w: 540, h: 360, label: "Heladeras", cols: 3 },
  ready_dispatch: { x: 520, y: 500, w: 430, h: 300, label: "Despacho", cols: 4 },
  delivered: { x: 990, y: 530, w: 540, h: 280, label: "Entregados hoy", cols: 4 },
};

export type SlotPos = { x: number; y: number; zone: ZoneId; overflow: boolean };

function slotInZone(zone: ZoneId, index: number): { x: number; y: number } {
  const z = ZONES[zone];
  const col = index % z.cols;
  const row = Math.floor(index / z.cols);
  const gapX = z.w / (z.cols + 0.4);
  const gapY = 62;
  return {
    x: z.x + 36 + col * gapX,
    y: z.y + 58 + row * gapY,
  };
}

export function sortForScene(a: MonitorOrder, b: MonitorOrder) {
  const ra = a.rangoHorario.localeCompare(b.rangoHorario);
  if (ra !== 0) return ra;
  const ua = a.updatedAt ?? "";
  const ub = b.updatedAt ?? "";
  if (ua !== ub) return ua.localeCompare(ub);
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
      const pos = slotInZone(zone, idx);
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
