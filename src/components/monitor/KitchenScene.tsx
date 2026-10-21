"use client";

import { useMemo, useRef, useState } from "react";
import type { MonitorFilter, MonitorOrder } from "@/lib/monitor/types";
import { assignSlots, type ZoneId } from "@/lib/monitor/layout";
import { KitchenBackdrop } from "./KitchenBackdrop";
import { OrderChip } from "./OrderChip";

export function KitchenScene({
  orders,
  filter,
  alertIds,
  selectedId,
  tv,
  calm,
  entering,
  onSelect,
  onOverflow,
}: {
  orders: MonitorOrder[];
  filter: MonitorFilter;
  alertIds: Set<string>;
  selectedId: string | null;
  tv: boolean;
  calm: boolean;
  entering?: string[];
  onSelect: (id: string) => void;
  onOverflow: (zone: ZoneId) => void;
}) {
  const { positions } = useMemo(() => assignSlots(orders), [orders]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.min(1.8, Math.max(0.7, z + (e.deltaY > 0 ? -0.08 : 0.08))));
  }

  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] border border-rose-100 bg-[#f8e6dc] shadow-[inset_0_1px_0_rgba(255,255,255,.6)]"
      onWheel={onWheel}
      onPointerDown={(e) => {
        if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
        drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        setPan({
          x: drag.current.px + (e.clientX - drag.current.x),
          y: drag.current.py + (e.clientY - drag.current.y),
        });
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerLeave={() => { drag.current = null; }}
    >
      <div
        className="absolute inset-0 grid origin-center place-items-center"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        <div className="relative aspect-[16/9] h-full max-w-full">
        <KitchenBackdrop calm={calm} />
        <div className="absolute inset-0">
          {orders.map((order) => {
            const slots = positions.get(order.id);
            if (!slots) return null;
            const dimmed = filter !== "all" && filter !== "alerts"
              ? filter === "ready_dispatch"
                ? order.status !== "ready_dispatch"
                : filter === "stored"
                  ? order.status !== "stored" && order.status !== "ready_dispatch"
                  : order.status !== filter
              : filter === "alerts" && !alertIds.has(order.id);
            return slots.map((slot, i) => (
              <OrderChip
                key={order.id + slot.zone + i}
                order={order}
                slot={slot}
                selected={selectedId === order.id}
                alert={alertIds.has(order.id)}
                tv={tv}
                dimmed={Boolean(dimmed)}
                entering={entering?.includes(order.id)}
                onSelect={(id) => {
                  if (id.startsWith("__overflow_")) onOverflow(id.replace("__overflow_", "") as ZoneId);
                  else onSelect(id);
                }}
              />
            ));
          })}
        </div>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 z-10 flex gap-1">
        <button type="button" className="rounded-lg bg-white/90 px-2 py-1 text-xs shadow" onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}>+</button>
        <button type="button" className="rounded-lg bg-white/90 px-2 py-1 text-xs shadow" onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}>−</button>
        <button type="button" className="rounded-lg bg-white/90 px-2 py-1 text-xs shadow" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Centrar</button>
      </div>
    </div>
  );
}
