"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, LayoutGrid, List as ListIcon, Snowflake, X, ChefHat, AlertTriangle, ChevronsRight, CalendarClock } from "lucide-react";
import { currentAndNextRangos } from "@/lib/monitor/time";
import { MONITOR_TZ, type MonitorFilter, type MonitorOrder, type MonitorStatus } from "@/lib/monitor/types";
import type { ZoneId } from "@/lib/monitor/layout";
import { urgencyOf } from "@/lib/monitor/urgency";
import { useMonitorDashboard } from "./useMonitorDashboard";
import { useMediaQuery, useStoredFlag, useToday } from "./useClientState";
import { playAlertChime, unlockAlertSound, useAlertSound } from "./useAlertSound";
import { MonitorHeader } from "./MonitorHeader";
import { MonitorKpiBar } from "./MonitorKpiBar";
import { KitchenScene } from "./KitchenScene";
import { MonitorList } from "./MonitorList";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import { AlertStrip } from "./AlertStrip";
import { FridgeZoom } from "./FridgeZoom";
import { DaySummary, LoadWidget, RangoWidget } from "./DayWidgets";
import { MonitorLegend } from "./MonitorLegend";
import { StatusBadge } from "./ui";
import "./monitor.css";

/** Estados que entran en la vista ampliada de cada sección. */
const FOCUS_STATUS: Record<ZoneId, MonitorStatus[]> = {
  pending: ["pending"],
  production: ["production"],
  stored: ["stored"],
  delivered: ["delivered"],
};
const FOCUS_ZONES = Object.keys(FOCUS_STATUS) as ZoneId[];

function isZone(v: string): v is ZoneId {
  return (FOCUS_ZONES as string[]).includes(v);
}

/** Sección donde se ve un pedido en su vista ampliada. */
function zoneOfOrder(order: MonitorOrder): ZoneId {
  return FOCUS_ZONES.find((z) => FOCUS_STATUS[z][0] === order.status) ?? "pending";
}

/** "miércoles 22/10" y su distancia a hoy ("mañana", "hace 3 días"…). */
function describeDay(fecha: string, today: string) {
  const name = new Date(`${fecha}T12:00:00-03:00`).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: MONITOR_TZ });
  const utc = (k: string) => Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)));
  const d = Math.round((utc(fecha) - utc(today)) / 86_400_000);
  const rel = d === 1 ? "mañana" : d === -1 ? "ayer" : d > 1 ? `en ${d} días` : `hace ${-d} días`;
  return { name, rel };
}

type View = "scene" | "list" | ZoneId;

export function MonitorApp() {
  const search = useSearchParams();
  const demo = search.get("demo") === "1" && process.env.NODE_ENV !== "production";
  // Sin fecha elegida se sigue a "hoy", que cambia sola a medianoche (útil para la TV que queda prendida).
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const fecha = picked ?? today;
  const otherDay = !!today && fecha !== today;
  const [filter, setFilter] = useState<MonitorFilter>("all");
  // "scene" = plano general; una ZoneId = esa sección ampliada a pantalla completa. En pantallas chicas arranca en lista.
  const small = useMediaQuery("(max-width: 900px)");
  const [viewPicked, setView] = useState<View | null>(null);
  const view: View = viewPicked ?? (small ? "list" : "scene");
  // En las vistas ampliadas las alertas arrancan minimizadas; se abren sin tocar la preferencia guardada.
  const [prodAlerts, setProdAlerts] = useState(false);
  const focus = isZone(view) ? view : null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [target, setTarget] = useState<{ id: string; n: number } | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tv, setTv] = useState(false);
  const [calm, setCalm] = useState(false);
  const [fridge, setFridge] = useState(false);
  // Preferencias guardadas: menú lateral y columna de alertas visibles, modo noche, sonido en modo TV.
  const [sidebarOn, setSidebarOn] = useStoredFlag("tammy.ops.sidebar", false);
  const [panelOn, setPanelOn] = useStoredFlag("tammy.ops.panel", false);
  const [night, setNight] = useStoredFlag("tammy.ops.night", false);
  const [sound, setSound] = useStoredFlag("tammy.ops.sound", false);
  const sidebarOff = !sidebarOn;
  const panelOff = !panelOn;
  const { snapshot, conn, diff, error, realtime } = useMonitorDashboard(fecha, demo);
  useAlertSound(snapshot?.fecha, snapshot?.alerts, tv && sound);

  // El menú lateral vive en el layout del dashboard (server); se oculta con una clase en <html>.
  useEffect(() => {
    const hide = sidebarOff || tv;
    document.documentElement.classList.toggle("tammy-ops-focus", hide);
    return () => document.documentElement.classList.remove("tammy-ops-focus");
  }, [sidebarOff, tv]);

  // "/" o Ctrl/Cmd+K abren el buscador desde cualquier lado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const alertIds = useMemo(() => new Set(snapshot?.alerts.map((a) => a.orderId) ?? []), [snapshot]);
  const urgency = useMemo(() => {
    if (!snapshot) return undefined;
    const now = new Date(snapshot.serverTime);
    return new Map(snapshot.orders.map((o) => [o.id, urgencyOf(o, snapshot.fecha, now)]));
  }, [snapshot]);
  const currentRango = snapshot && snapshot.fecha === today ? currentAndNextRangos(new Date(snapshot.serverTime)).current : null;
  const selected: MonitorOrder | null = snapshot?.orders.find((o) => o.id === selectedId) ?? null;

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!snapshot || !q) return [];
    return snapshot.orders
      .filter((o) => `${o.code} ${o.customerName} ${o.endCustomerName ?? ""} ${o.items.map((i) => i.name).join(" ")}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [snapshot, q]);

  /** Click en una caja o fila: solo abre el detalle. */
  function locate(id: string) {
    setSelectedId(id);
    setSearchOpen(false);
  }

  /** Buscador, alertas y heladeras: abre la sección del pedido y la cámara va a su caja. */
  function goTo(id: string) {
    const order = snapshot?.orders.find((o) => o.id === id);
    setSelectedId(id);
    setSearchOpen(false);
    setQuery("");
    searchRef.current?.blur();
    if (!order || view === "list") return;
    const zone = zoneOfOrder(order);
    if (zone !== focus) openFocus(zone);
    setTarget((t) => ({ id, n: (t?.n ?? 0) + 1 }));
  }

  /** Cambio de vista a mano: la cámara deja de seguir el último pedido buscado. */
  function changeView(next: View) {
    setTarget(null);
    setView(next);
  }

  function onOverflow(zone: ZoneId) {
    const map: Record<ZoneId, MonitorFilter> = {
      pending: "pending",
      production: "production",
      stored: "stored",
      delivered: "delivered",
    };
    setFilter(map[zone]);
    changeView("list");
  }

  function fullscreen() {
    const el = document.getElementById("tammy-ops-root");
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
    setTv(true);
  }

  function openFocus(zone: ZoneId | null) {
    setProdAlerts(false);
    setFilter("all");
    changeView(zone ?? "scene");
  }

  // Las tarjetas de sección abren su vista ampliada (y la cierran si ya está abierta); Alertas sigue filtrando.
  function onKpi(f: MonitorFilter) {
    if (isZone(f)) openFocus(view === f ? null : f);
    else setFilter(f);
  }

  function toggleSound() {
    const next = !sound;
    setSound(next);
    if (next) void unlockAlertSound().then(playAlertChime);
  }

  const showPanel = focus ? prodAlerts : !panelOff;

  const sceneOrders = snapshot
    ? q
      ? snapshot.orders.filter((o) => `${o.code} ${o.customerName} ${o.endCustomerName ?? ""}`.toLowerCase().includes(q))
      : snapshot.orders
    : [];

  const day = otherDay ? describeDay(fecha, today) : null;
  const dataDay = snapshot && snapshot.fecha !== today && today ? describeDay(snapshot.fecha, today) : null;

  return (
    <div id="tammy-ops-root" className={`tammy-ops relative h-[100dvh] overflow-hidden ${calm ? "calm" : ""} ${tv ? "tv" : ""}`}>
      <div className={view === "list" ? "absolute inset-0" : "absolute inset-x-0 bottom-0 top-[13.25rem]"}>
        {!snapshot ? (
          <div className="flex h-full items-center justify-center text-sm text-[#9a837d]">Cargando obrador…</div>
        ) : view === "list" ? (
          <div className="h-full px-3 pb-3 pt-[13.25rem]">
            <MonitorList
              orders={snapshot.orders}
              filter={filter}
              alertIds={alertIds}
              selectedId={selectedId}
              query={query}
              onSelect={locate}
            />
          </div>
        ) : (
          <KitchenScene
            key={view}
            orders={focus ? sceneOrders.filter((o) => FOCUS_STATUS[focus].includes(o.status)) : sceneOrders}
            filter={focus ? "all" : filter}
            alertIds={alertIds}
            selectedId={selectedId}
            tv={tv}
            calm={calm}
            entering={diff.entered}
            focus={focus}
            urgency={urgency}
            target={target}
            onFocus={openFocus}
            onSearch={() => searchRef.current?.focus()}
            onSelect={locate}
            onOverflow={onOverflow}
          />
        )}
        {day && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-3">
            <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50/95 px-4 py-2 text-amber-900 shadow-lg">
              <CalendarClock className="h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm">
                <b>No es hoy:</b> estás viendo el <b>{day.name}</b> ({day.rel})
              </p>
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white hover:bg-amber-600"
              >
                Volver a hoy
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-[#fff5f2] via-[#fff5f2]/95 to-transparent pb-3">
      <div className="pointer-events-auto">
      <MonitorHeader
        fecha={fecha}
        onFecha={(v) => setPicked(v && v !== today ? v : null)}
        otherDay={otherDay}
        conn={conn}
        realtime={realtime}
        updatedAt={snapshot?.updatedAt}
        demo={demo}
        tv={tv}
        calm={calm}
        night={night}
        sound={sound}
        sidebarOff={sidebarOff || tv}
        panelOff={focus ? !prodAlerts : panelOff}
        onTv={() => setTv((v) => !v)}
        onCalm={() => setCalm((v) => !v)}
        onNight={() => setNight(!night)}
        onSound={toggleSound}
        onSidebar={() => setSidebarOn(!sidebarOn)}
        onPanel={() => (focus ? setProdAlerts((v) => !v) : setPanelOn(!panelOn))}
        onFullscreen={fullscreen}
      />
      {snapshot && <MonitorKpiBar kpis={snapshot.kpis} filter={focus ?? filter} onFilter={onKpi} />}
      {snapshot && (
        <DaySummary
          orders={snapshot.orders}
          dayLabel={dataDay ? dataDay.name : "Hoy"}
          currentRango={currentRango}
          onProduction={() => openFocus("production")}
        />
      )}
      {error && conn !== "live" && (
        <p className="px-3 text-xs text-amber-800">
          {conn === "stale" ? "Mostrando último snapshot válido. " : ""}{error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 px-3 pb-1">
            <div className="relative min-w-[240px] flex-1">
              <div className="glass flex h-10 items-center gap-2 rounded-xl px-3 ring-[#d45a78]/40 focus-within:ring-2">
                <Search className="h-4 w-4 text-[#c45b72]" />
                <input
                  ref={searchRef}
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
                  onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && results[0]) goTo(results[0].id); if (e.key === "Escape") { setQuery(""); setSearchOpen(false); e.currentTarget.blur(); } }}
                  placeholder="Buscar pedido: código o cliente… y Enter para ir a la caja"
                  className="h-full flex-1 bg-transparent text-sm text-[#3f2b25] outline-none placeholder:text-[#b59d97]"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery("")} className="rounded p-0.5 text-[#9a837d] hover:bg-rose-50" aria-label="Limpiar">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden rounded-md border border-[#ecd6d0] bg-white/70 px-1.5 text-[11px] text-[#9a837d] sm:block">/</kbd>
                )}
              </div>
              {searchOpen && q && (
                <div className="glass-strong absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl">
                  {results.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-[#9a837d]">Sin resultados para “{query}”</p>
                  ) : (
                    results.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goTo(o.id)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#fff7f4]"
                      >
                        <span className="plate text-sm text-[#3f2b25]">{o.code}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-[#6f5750]">{o.endCustomerName ?? o.customerName}</span>
                        <span className="plate text-xs text-[#9a837d]">{o.unitsOrdered}u</span>
                        <StatusBadge status={o.status} alert={alertIds.has(o.id)} />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="glass flex items-center rounded-xl p-1">
              <Seg active={view === "scene"} onClick={() => changeView("scene")} icon={<LayoutGrid className="h-3.5 w-3.5" />}>Escena</Seg>
              <Seg active={view === "production"} onClick={() => openFocus("production")} icon={<ChefHat className="h-3.5 w-3.5" />}>Producción</Seg>
              <Seg active={view === "list"} onClick={() => changeView("list")} icon={<ListIcon className="h-3.5 w-3.5" />}>Lista</Seg>
            </div>
            <div className="glass flex items-center rounded-xl p-1">
              <Seg active={fridge} onClick={() => setFridge(true)} icon={<Snowflake className="h-3.5 w-3.5" />}>Heladeras</Seg>
            </div>
          </div>
      </div>
      </div>

      {snapshot && view !== "list" && (
        <div className="absolute bottom-3 left-3 z-20">
          <MonitorLegend />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 z-30 [&>*]:pointer-events-auto">
        {snapshot && !showPanel && (
          <button
            type="button"
            onClick={() => (focus ? setProdAlerts(true) : setPanelOn(true))}
            className="glass absolute right-3 top-[14.25rem] hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-[#6f5750] hover:bg-rose-50 lg:flex"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-[#d9453d]" />
            Alertas{snapshot.alerts.length ? ` · ${snapshot.alerts.length}` : ""}
          </button>
        )}
        {snapshot && !showPanel && selected && (
          <div className="absolute bottom-3 right-3 hidden w-[340px] lg:block" style={{ height: "min(72dvh, 680px)" }}>
            <OrderDetailDrawer order={selected} tv={tv} alert={alertIds.has(selected.id)} onClose={() => setSelectedId(null)} />
          </div>
        )}
        {snapshot && showPanel && (
          <div className="absolute bottom-3 right-3 top-[14.25rem] hidden w-[340px] flex-col gap-3 lg:flex">
            <button
              type="button"
              onClick={() => (focus ? setProdAlerts(false) : setPanelOn(false))}
              className="glass flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold text-[#6f5750] hover:bg-rose-50"
            >
              <ChevronsRight className="h-3.5 w-3.5" /> Minimizar alertas
            </button>
            {selected ? (
              <>
                <div className="min-h-0 flex-1">
                  <OrderDetailDrawer order={selected} tv={tv} alert={alertIds.has(selected.id)} onClose={() => setSelectedId(null)} />
                </div>
                <AlertStrip alerts={snapshot.alerts} onSelect={goTo} selectedId={selectedId} compact />
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                <AlertStrip alerts={snapshot.alerts} onSelect={goTo} selectedId={selectedId} />
                <RangoWidget orders={snapshot.orders} currentRango={currentRango} />
                <LoadWidget orders={snapshot.orders} />
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] p-3 lg:hidden">
          <OrderDetailDrawer order={selected} tv={tv} alert={alertIds.has(selected.id)} onClose={() => setSelectedId(null)} />
        </div>
      )}
      {fridge && snapshot && (
        <FridgeZoom
          locations={snapshot.locations}
          orders={snapshot.orders}
          onSelect={(id) => { setFridge(false); goTo(id); }}
          onClose={() => setFridge(false)}
        />
      )}
      {/* Modo noche: velo oscuro sobre todo, sin filtros caros para la TV. */}
      {night && <div className="pointer-events-none absolute inset-0 z-[60] bg-[#120a1c]/45" aria-hidden />}
    </div>
  );
}

function Seg({ children, active, onClick, icon }: { children: React.ReactNode; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${active ? "bg-[#d45a78] text-white shadow-sm" : "text-[#6f5750] hover:bg-rose-50"}`}
    >
      {icon}
      {children}
    </button>
  );
}
