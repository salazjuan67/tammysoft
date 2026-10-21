import type { MonitorOrder, MonitorStatus } from "./types";
import { sceneStatus } from "./selectors";

export type OrderDiff = {
  entered: string[];
  left: string[];
  moved: Array<{ id: string; from: MonitorStatus; to: MonitorStatus }>;
};

export function diffOrders(prev: MonitorOrder[] | undefined, next: MonitorOrder[]): OrderDiff {
  if (!prev) return { entered: [], left: [], moved: [] };
  const prevMap = new Map(prev.map((o) => [o.id, o]));
  const nextIds = new Set(next.map((o) => o.id));
  const entered: string[] = [];
  const left: string[] = [];
  const moved: OrderDiff["moved"] = [];

  for (const order of next) {
    const old = prevMap.get(order.id);
    if (!old) entered.push(order.id);
    else if (sceneStatus(old) !== sceneStatus(order)) {
      moved.push({ id: order.id, from: sceneStatus(old), to: sceneStatus(order) });
    }
  }
  for (const order of prev) {
    if (!nextIds.has(order.id)) left.push(order.id);
  }
  return { entered, left, moved };
}
