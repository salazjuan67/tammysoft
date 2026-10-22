"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, ChefHat, Snowflake, Package, CheckCircle2, ZoomIn, ZoomOut, Crosshair, Tag, Search } from "lucide-react";
import type { MonitorFilter, MonitorOrder } from "@/lib/monitor/types";
import { assignSlots, ZONE_LABEL, type SceneLayout, type ZoneId } from "@/lib/monitor/layout";
import { currentAndNextRangos } from "@/lib/monitor/time";
import type { Urgency } from "@/lib/monitor/urgency";
import { crewGroups, crewStations, KitchenBackdrop } from "./KitchenBackdrop";
import { useCrew } from "./useCrew";
import { CRATE_W, IsoWorker } from "./Iso";
import { OrderChip } from "./OrderChip";
import { STATUS_META } from "./ui";

/** Distancia horizontal mínima entre una persona y el centro de una caja: puede pisarla, no taparla entera. */
const CREW_CLEARANCE = 48;

const ZONE_ICON: Record<ZoneId, typeof ClipboardList> = {
  pending: ClipboardList,
  production: ChefHat,
  stored: Snowflake,
  ready_dispatch: Package,
  delivered: CheckCircle2,
};

const ZONE_ORDER: ZoneId[] = ["pending", "production", "stored", "ready_dispatch", "delivered"];

/** Zoom de rueda a partir del cual el plano general salta a la vista de la sección bajo el cursor. */
const FOCUS_ZOOM = 1.4;

/** Rectángulo del mundo que encuadra cada sección en su vista ampliada. */
function focusRect(layout: SceneLayout, focus: ZoneId) {
  const { width: W, height: H, rooms, fridge, coldSplitX, coldFloorY } = layout;
  switch (focus) {
    case "pending":
      return { x0: 0, x1: rooms.pending[1], y0: 170, y1: H - 20 };
    case "production":
      return { x0: rooms.production[0] - 20, x1: rooms.production[1] + 20, y0: 170, y1: H - 20 };
    case "stored":
      return { x0: fridge.xs[0] - 40, x1: fridge.xs[2] + fridge.w + 40, y0: 70, y1: fridge.y + fridge.h + 40 };
    case "ready_dispatch":
      return { x0: rooms.cold[0] + 10, x1: coldSplitX, y0: coldFloorY - 40, y1: H - 20 };
    case "delivered":
      return { x0: coldSplitX, x1: W - 10, y0: coldFloorY - 40, y1: H - 20 };
  }
}

/** `contentBottom`: y más baja con cajas en la sección; el encuadre no baja mucho más para no mostrar piso vacío. */
function focusCamera(layout: SceneLayout, focus: ZoneId, fit: number, contentBottom?: number) {
  const r = focusRect(layout, focus);
  if (contentBottom != null) r.y1 = Math.min(r.y1, Math.max(r.y0 + 520, contentBottom + 230));
  const zoom = Math.min(2.6, layout.width / (r.x1 - r.x0), layout.height / (r.y1 - r.y0));
  const scale = fit * zoom;
  return {
    zoom,
    pan: {
      x: -((r.x0 + r.x1) / 2 - layout.width / 2) * scale,
      y: -((r.y0 + r.y1) / 2 - layout.height / 2) * scale,
    },
  };
}

function zoneAt(layout: SceneLayout, x: number, y: number): ZoneId {
  if (x < layout.rooms.pending[1]) return "pending";
  if (x < layout.rooms.production[1]) return "production";
  if (y < layout.coldFloorY - 20) return "stored";
  return x < layout.coldSplitX ? "ready_dispatch" : "delivered";
}

export function KitchenScene({
  orders,
  filter,
  alertIds,
  selectedId,
  tv,
  calm,
  entering,
  focus = null,
  urgency,
  target,
  onFocus,
  onSearch,
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
  /** Sección ampliada a pantalla completa; el resto de los pedidos se oculta. */
  focus?: ZoneId | null;
  urgency?: Map<string, Urgency>;
  /** Pedido buscado: la cámara lo encuadra; `n` cambia en cada búsqueda aunque sea el mismo pedido. */
  target?: { id: string; n: number } | null;
  /** Pide entrar a una sección (click en su cartel o zoom sobre ella) o volver al plano general (null). */
  onFocus?: (zone: ZoneId | null) => void;
  onSearch?: () => void;
  onSelect: (id: string) => void;
  onOverflow: (zone: ZoneId) => void;
}) {
  const [size, setSize] = useState({ width: 1600, height: 900 });
  // Redondeado para no recalcular el armado en cada píxel de un resize.
  const aspect = Math.round((size.width / Math.max(1, size.height)) * 20) / 20;
  const { positions, buckets, perFridge, layout } = useMemo(() => assignSlots(orders, aspect, focus), [orders, aspect, focus]);
  const currentRango = currentAndNextRangos().current;
  const [labels, setLabels] = useState(true);
  const fit = Math.min(size.width / layout.width, size.height / layout.height);
  const [dragging, setDragging] = useState(false);
  // null = cámara automática (plano general, o la sección enfocada). `tag` = búsqueda vigente al moverla a mano:
  // una búsqueda nueva vuelve a encuadrar el pedido aunque el usuario haya movido la cámara antes.
  const [override, setOverride] = useState<{ zoom: number; pan: { x: number; y: number }; tag: number } | null>(null);
  const tag = target?.n ?? 0;
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  // Al entrar a una vista los últimos pasos de la rueda se ignoran, para no seguir acercando de más.
  const wheelReadyAt = useRef(0);
  useEffect(() => {
    wheelReadyAt.current = Date.now() + 450;
  }, []);

  const contentBottom = useMemo(() => {
    if (!focus || focus === "stored") return undefined;
    const ys = [...positions.values()].flat().filter((p) => p.zone === focus && p.kind === "crate").map((p) => p.y);
    return ys.length ? Math.max(...ys) : undefined;
  }, [positions, focus]);
  const auto = focus ? focusCamera(layout, focus, fit, contentBottom) : { zoom: 1, pan: { x: 0, y: 0 } };
  const targetCam = target ? cameraOn(target.id) : null;
  const cam = override && override.tag === tag ? override : (targetCam ?? auto);
  const zoom = cam.zoom;
  const pan = cam.pan;

  function currentCam() {
    return cam;
  }

  /** Encuadra la caja (o el renglón de heladera) del pedido, un poco más cerca que la vista de la sección. */
  function cameraOn(id: string) {
    const slot = positions.get(id)?.find((s) => !s.overflow && (!focus || s.zone === focus));
    if (!slot) return null;
    const cx = slot.x + (slot.kind === "shelf" ? (slot.w ?? 230) / 2 : CRATE_W / 2);
    const cy = slot.y + (slot.kind === "shelf" ? 10 : 30);
    const z = Math.min(2.6, Math.max(1.6, auto.zoom * 1.3));
    const s = fit * z;
    return { zoom: z, pan: { x: -(cx - layout.width / 2) * s, y: -(cy - layout.height / 2) * s } };
  }

  /** Cambia el zoom dejando quieto el punto de pantalla `m` (offset desde el centro del contenedor). */
  function zoomTo(next: number, m = { x: 0, y: 0 }) {
    const base = currentCam();
    const k = next / base.zoom;
    setOverride({ zoom: next, pan: { x: m.x - (m.x - base.pan.x) * k, y: m.y - (m.y - base.pan.y) * k }, tag });
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

  // Las personas se paran entre las cajas de su mesa, sin quedar justo delante de una.
  const crateCenters = useMemo(
    () =>
      [...positions.values()].flat().filter((p) => p.kind === "crate").map((p) => ({ x: p.x + CRATE_W / 2, y: p.y })),
    [positions],
  );
  const crew = useCrew(
    crewGroups(layout, {
      pending: buckets.pending.length,
      production: buckets.production.length,
      dispatch: buckets.ready_dispatch.length,
    }).map((g) => crewStations(g, crateCenters, CREW_CLEARANCE)),
    !calm,
  );

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    if (!box.current || Date.now() < wheelReadyAt.current) return;
    const base = currentCam();
    const next = Math.min(2.6, Math.max(0.7, base.zoom + (e.deltaY > 0 ? -0.08 : 0.08)));
    const rect = box.current.getBoundingClientRect();
    const m = { x: e.clientX - rect.left - rect.width / 2, y: e.clientY - rect.top - rect.height / 2 };
    if (onFocus && !focus && e.deltaY < 0 && next >= FOCUS_ZOOM) {
      const s = fit * base.zoom;
      onFocus(zoneAt(layout, layout.width / 2 + (m.x - base.pan.x) / s, layout.height / 2 + (m.y - base.pan.y) / s));
      return;
    }
    if (onFocus && focus && e.deltaY > 0 && next < auto.zoom * 0.75) {
      onFocus(null);
      return;
    }
    zoomTo(next, m);
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
        setOverride({ zoom: base.zoom, pan: { x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }, tag });
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

        {/* Carteles por encima de las cajas: se pueden tocar para ampliar la sección. */}
        <div className="pointer-events-none absolute inset-0 z-10">
          {ZONE_ORDER.filter((zone) => !focus || zone === focus).map((zone) => {
            const Icon = ZONE_ICON[zone];
            const meta = STATUS_META[zone];
            const count = buckets[zone].length;
            const units = buckets[zone].reduce((s, o) => s + o.unitsOrdered, 0);
            return (
              <button
                type="button"
                key={zone}
                title={focus ? undefined : `Ver ${ZONE_LABEL[zone].toLowerCase()} en grande`}
                onClick={() => !focus && onFocus?.(zone)}
                className={`sector-tag absolute ${focus ? "" : "pointer-events-auto cursor-pointer"}`}
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
              </button>
            );
          })}

          {(!focus || focus === "stored") && layout.fridge.xs.map((fx, i) => {
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

        <div className="absolute inset-0 z-0">
          {crew.map((w, i) => (
            <svg
              key={w.id}
              className="tammy-ops-crew pointer-events-none absolute"
              style={{ left: w.x - 40, top: w.y - 140, zIndex: Math.round(w.y / 4) }}
              width="80"
              height="150"
              viewBox="-40 -140 80 150"
              aria-hidden
            >
              <IsoWorker x={0} y={0} accent={w.accent} courier={w.courier} variant={i} walking={w.walking} working={!calm} />
            </svg>
          ))}
          {orders.flatMap((order, i) => {
            const slots = positions.get(order.id);
            if (!slots) return [];
            const visible = focus ? slots.filter((slot) => slot.zone === focus) : slots;
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
                urgency={urgency?.get(order.id)}
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

      {focus && orders.length === 0 && (
        <div className="glass absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl px-5 py-3 text-sm text-[#6f5750]">
          No hay pedidos en {ZONE_LABEL[focus].toLowerCase()} para esta fecha
        </div>
      )}

      <div className="glass absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-xl p-1">
        {onSearch && <Ctrl label="Buscar pedido ( / )" onClick={onSearch}><Search className="h-4 w-4" /></Ctrl>}
        <Ctrl label="Alejar" onClick={() => zoomTo(Math.max(0.7, currentCam().zoom - 0.1))}><ZoomOut className="h-4 w-4" /></Ctrl>
        <Ctrl label="Acercar" onClick={() => zoomTo(Math.min(2.6, currentCam().zoom + 0.1))}><ZoomIn className="h-4 w-4" /></Ctrl>
        <Ctrl label="Centrar" onClick={() => setOverride({ ...auto, tag })}><Crosshair className="h-4 w-4" /></Ctrl>
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
