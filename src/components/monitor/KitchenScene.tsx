"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, ChefHat, Snowflake, Package, CheckCircle2, ZoomIn, ZoomOut, Crosshair, Tag } from "lucide-react";
import type { MonitorFilter, MonitorOrder } from "@/lib/monitor/types";
import { assignSlots, FRIDGE, WORLD, ZONES, type ZoneId } from "@/lib/monitor/layout";
import { currentAndNextRangos } from "@/lib/monitor/time";
import { KitchenBackdrop } from "./KitchenBackdrop";
import { OrderChip } from "./OrderChip";
import { STATUS_META } from "./ui";

const ZONE_ICON: Record<ZoneId, typeof ClipboardList> = {
  pending: ClipboardList,
  production: ChefHat,
  stored: Snowflake,
  ready_dispatch: Package,
  delivered: CheckCircle2,
};

const TAG_POS: Record<ZoneId, { x: number; y: number }> = {
  pending: { x: 96, y: 440 },
  production: { x: 590, y: 198 },
  stored: { x: 1410, y: 104 },
  ready_dispatch: { x: 1430, y: 520 },
  delivered: { x: 1810, y: 520 },
};

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
  const { positions, buckets, perFridge } = useMemo(() => assignSlots(orders), [orders]);
  const currentRango = currentAndNextRangos().current;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [labels, setLabels] = useState(true);
  const [fit, setFit] = useState(1);
  const [dragging, setDragging] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setFit(Math.min(width / WORLD.width, height / WORLD.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Las etiquetas HTML se contra-escalan para quedar siempre legibles (como en Carman),
  // con tope para que no tapen la escena cuando el mundo se achica mucho.
  const labelScale = Math.min(1.6, Math.max(1, 1 / (fit * zoom)));

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.min(2.2, Math.max(0.7, z + (e.deltaY > 0 ? -0.08 : 0.08))));
  }

  function isDimmed(order: MonitorOrder) {
    if (filter === "all") return false;
    if (filter === "alerts") return !alertIds.has(order.id);
    if (filter === "ready_dispatch") return order.status !== "ready_dispatch";
    if (filter === "stored") return order.status !== "stored" && order.status !== "ready_dispatch";
    return order.status !== filter;
  }

  return (
    <div
      ref={box}
      className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] border border-rose-100 bg-[#f8e6dc] shadow-[inset_0_1px_0_rgba(255,255,255,.6)]"
      onWheel={onWheel}
      onPointerDown={(e) => {
        if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
        drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
      }}
      onPointerUp={() => { drag.current = null; setDragging(false); }}
      onPointerLeave={() => { drag.current = null; setDragging(false); }}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: WORLD.width,
          height: WORLD.height,
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${fit * zoom})`,
          transformOrigin: "center",
          transition: dragging ? "none" : "transform 160ms ease",
        }}
      >
        <KitchenBackdrop calm={calm} />

        <div className="pointer-events-none absolute inset-0">
          {(Object.keys(ZONES) as ZoneId[]).map((zone) => {
            const Icon = ZONE_ICON[zone];
            const meta = STATUS_META[zone];
            const count = buckets[zone].length;
            const units = buckets[zone].reduce((s, o) => s + o.unitsOrdered, 0);
            return (
              <div
                key={zone}
                className="sector-tag absolute"
                style={{
                  left: TAG_POS[zone].x,
                  top: TAG_POS[zone].y,
                  transform: `scale(${labelScale})`,
                  transformOrigin: "0 100%",
                  ["--accent" as string]: meta.color,
                }}
              >
                <span className="sector-tag__icon"><Icon className="h-3.5 w-3.5" /></span>
                <span className="sector-tag__name">{ZONES[zone].label}</span>
                <span className="sector-tag__count">{count}</span>
                <span className="text-[10px] text-[#9a837d]">{units} potes</span>
              </div>
            );
          })}

          {FRIDGE.xs.map((fx, i) => {
            const list = perFridge[i];
            const units = list.reduce((s, o) => s + o.unitsOrdered, 0);
            return (
              <div key={fx} className="fridge-head" style={{ left: fx, top: FRIDGE.y, width: FRIDGE.w, height: FRIDGE.headH }}>
                <span className="fridge-head__icon"><Snowflake className="h-4 w-4" /></span>
                <span className="fridge-head__name">Heladera {i + 1}</span>
                <span className="fridge-head__meta">
                  {list.length === 0 ? <small>vacía</small> : <>{units}u <small>· {list.length}</small></>}
                </span>
              </div>
            );
          })}
        </div>

        <div className="absolute inset-0">
          {orders.flatMap((order, i) => {
            const slots = positions.get(order.id);
            if (!slots) return [];
            const dimmed = isDimmed(order);
            const isEntering = entering?.includes(order.id);
            return slots.map((slot, s) => (
              <OrderChip
                // Clave estable por pedido: al cambiar de sala, la caja se desliza en vez de remontarse.
                key={s === 0 ? order.id : `${order.id}:${slot.zone}`}
                order={order}
                slot={slot}
                selected={selectedId === order.id}
                alert={alertIds.has(order.id)}
                hot={order.rangoHorario === currentRango}
                tv={tv}
                dimmed={dimmed}
                entering={isEntering}
                enterDelay={Math.min(600, i * 35)}
                showLabel={labels}
                labelScale={labelScale}
                onSelect={(id) => {
                  if (id.startsWith("__overflow_")) onOverflow(id.replace("__overflow_", "") as ZoneId);
                  else onSelect(id);
                }}
              />
            ));
          })}
        </div>
      </div>

      <div className="glass absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-xl p-1">
        <Ctrl label="Alejar" onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}><ZoomOut className="h-4 w-4" /></Ctrl>
        <Ctrl label="Acercar" onClick={() => setZoom((z) => Math.min(2.2, z + 0.1))}><ZoomIn className="h-4 w-4" /></Ctrl>
        <Ctrl label="Centrar" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Crosshair className="h-4 w-4" /></Ctrl>
        <Ctrl label="Etiquetas" active={labels} onClick={() => setLabels((v) => !v)}><Tag className="h-4 w-4" /></Ctrl>
      </div>
    </div>
  );
}

function Ctrl({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-lg text-[#6f5750] transition hover:bg-rose-50 ${active ? "bg-rose-100 text-[#c45b72]" : ""}`}
    >
      {children}
    </button>
  );
}
