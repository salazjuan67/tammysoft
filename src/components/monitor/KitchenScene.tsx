"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, ChefHat, Snowflake, Package, CheckCircle2, ZoomIn, ZoomOut, Crosshair, Tag } from "lucide-react";
import type { MonitorFilter, MonitorOrder } from "@/lib/monitor/types";
import { assignSlots, ZONE_LABEL, type SceneLayout, type ZoneId } from "@/lib/monitor/layout";
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

const ZONE_ORDER: ZoneId[] = ["pending", "production", "stored", "ready_dispatch", "delivered"];

/** Encuadra la sala de producción (desde el cartel hasta el piso) para que llene la pantalla. */
function productionCamera(layout: SceneLayout, fit: number) {
  const [x0, x1] = layout.rooms.production;
  const top = 170;
  const bottom = layout.height - 20;
  const zoom = Math.min(2.6, layout.width / (x1 - x0 + 40), layout.height / (bottom - top));
  const scale = fit * zoom;
  return {
    zoom,
    pan: {
      x: -((x0 + x1) / 2 - layout.width / 2) * scale,
      y: -((top + bottom) / 2 - layout.height / 2) * scale,
    },
  };
}

export function KitchenScene({
  orders,
  filter,
  alertIds,
  selectedId,
  tv,
  calm,
  entering,
  focusProduction,
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
  /** Encuadra solo la sala de producción y oculta el resto de los pedidos. */
  focusProduction?: boolean;
  onSelect: (id: string) => void;
  onOverflow: (zone: ZoneId) => void;
}) {
  const [size, setSize] = useState({ width: 1600, height: 900 });
  // Redondeado para no recalcular el armado en cada píxel de un resize.
  const aspect = Math.round((size.width / Math.max(1, size.height)) * 20) / 20;
  const { positions, buckets, perFridge, layout } = useMemo(() => assignSlots(orders, aspect, focusProduction), [orders, aspect, focusProduction]);
  const currentRango = currentAndNextRangos().current;
  const [labels, setLabels] = useState(true);
  const fit = Math.min(size.width / layout.width, size.height / layout.height);
  const [dragging, setDragging] = useState(false);
  // null = cámara automática (plano general, o la sala de producción si está enfocada).
  const [override, setOverride] = useState<{ zoom: number; pan: { x: number; y: number } } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const auto = focusProduction ? productionCamera(layout, fit) : { zoom: 1, pan: { x: 0, y: 0 } };
  const zoom = override?.zoom ?? auto.zoom;
  const pan = override?.pan ?? auto.pan;

  function currentCam() {
    return override ?? auto;
  }

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Las etiquetas HTML se contra-escalan para quedar siempre legibles (como en Carman),
  // con tope para que no tapen la escena cuando el mundo se achica mucho.
  const labelScale = Math.min(1.6, Math.max(1, 1 / (fit * zoom)));

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const base = currentCam();
    setOverride({ ...base, zoom: Math.min(2.6, Math.max(0.7, base.zoom + (e.deltaY > 0 ? -0.08 : 0.08))) });
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
      className="relative h-full w-full overflow-hidden bg-[#f8e6dc]"
      onWheel={onWheel}
      onPointerDown={(e) => {
        if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
        const base = currentCam();
        drag.current = { x: e.clientX, y: e.clientY, px: base.pan.x, py: base.pan.y };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const base = currentCam();
        setOverride({ zoom: base.zoom, pan: { x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) } });
      }}
      onPointerUp={() => { drag.current = null; setDragging(false); }}
      onPointerLeave={() => { drag.current = null; setDragging(false); }}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: layout.width,
          height: layout.height,
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${fit * zoom})`,
          transformOrigin: "center",
          transition: dragging ? "none" : "transform 160ms ease",
        }}
      >
        <KitchenBackdrop calm={calm} layout={layout} />

        <div className="pointer-events-none absolute inset-0">
          {ZONE_ORDER.filter((zone) => !focusProduction || zone === "production").map((zone) => {
            const Icon = ZONE_ICON[zone];
            const meta = STATUS_META[zone];
            const count = buckets[zone].length;
            const units = buckets[zone].reduce((s, o) => s + o.unitsOrdered, 0);
            return (
              <div
                key={zone}
                className="sector-tag absolute"
                style={{
                  left: layout.tags[zone].x,
                  top: layout.tags[zone].y,
                  transform: `scale(${labelScale})`,
                  transformOrigin: "0 100%",
                  ["--accent" as string]: meta.color,
                }}
              >
                <span className="sector-tag__icon"><Icon className="h-3.5 w-3.5" /></span>
                <span className="sector-tag__name">{ZONE_LABEL[zone]}</span>
                <span className="sector-tag__count">{count}</span>
                <span className="text-[10px] text-[#9a837d]">{units} potes</span>
              </div>
            );
          })}

          {!focusProduction && layout.fridge.xs.map((fx, i) => {
            const list = perFridge[i];
            const units = list.reduce((s, o) => s + o.unitsOrdered, 0);
            return (
              <div key={i} className="fridge-head" style={{ left: fx, top: layout.fridge.y, width: layout.fridge.w, height: layout.fridge.headH }}>
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
            const visible = focusProduction ? slots.filter((slot) => slot.zone === "production") : slots;
            if (visible.length === 0) return [];
            const dimmed = isDimmed(order);
            const isEntering = entering?.includes(order.id);
            return visible.map((slot, s) => (
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

      {focusProduction && orders.length === 0 && (
        <div className="glass absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl px-5 py-3 text-sm text-[#6f5750]">
          No hay pedidos en producción para esta fecha
        </div>
      )}

      <div className="glass absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-xl p-1">
        <Ctrl label="Alejar" onClick={() => { const base = currentCam(); setOverride({ ...base, zoom: Math.max(0.7, base.zoom - 0.1) }); }}><ZoomOut className="h-4 w-4" /></Ctrl>
        <Ctrl label="Acercar" onClick={() => { const base = currentCam(); setOverride({ ...base, zoom: Math.min(2.6, base.zoom + 0.1) }); }}><ZoomIn className="h-4 w-4" /></Ctrl>
        <Ctrl label="Centrar" onClick={() => setOverride(null)}><Crosshair className="h-4 w-4" /></Ctrl>
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
