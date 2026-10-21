"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, LayoutGrid, List as ListIcon, Snowflake, X, ChefHat, AlertTriangle, ChevronsRight } from "lucide-react";
import { fechaKey } from "@/lib/monitor/time";
import type { MonitorFilter, MonitorOrder, MonitorStatus } from "@/lib/monitor/types";
import type { ZoneId } from "@/lib/monitor/layout";
import { useMonitorDashboard } from "./useMonitorDashboard";
import { MonitorHeader } from "./MonitorHeader";
import { MonitorKpiBar } from "./MonitorKpiBar";
import { KitchenScene } from "./KitchenScene";
import { MonitorList } from "./MonitorList";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import { AlertStrip } from "./AlertStrip";
import { FridgeZoom } from "./FridgeZoom";
import { LoadWidget, RangoWidget } from "./DayWidgets";
import { StatusBadge } from "./ui";
import "./monitor.css";

/** Estados que entran en la vista ampliada de cada sección. */
const FOCUS_STATUS: Record<ZoneId, MonitorStatus[]> = {
  pending: ["pending"],
  production: ["production"],
  stored: ["stored", "ready_dispatch"],
  ready_dispatch: ["ready_dispatch"],
  delivered: ["delivered"],
};
const FOCUS_ZONES = Object.keys(FOCUS_STATUS) as ZoneId[];

function isZone(v: string): v is ZoneId {
  return (FOCUS_ZONES as string[]).includes(v);
}

export function MonitorApp() {
  const search = useSearchParams();
  const demo = search.get("demo") === "1" && process.env.NODE_ENV !== "production";
  const [fecha, setFecha] = useState(fechaKey());
  const [filter, setFilter] = useState<MonitorFilter>("all");
  // "scene" = plano general; una ZoneId = esa sección ampliada a pantalla completa.
  const [view, setView] = useState<"scene" | "list" | ZoneId>("scene");
  // En las vistas ampliadas las alertas arrancan minimizadas; se abren sin tocar la preferencia guardada.
  const [prodAlerts, setProdAlerts] = useState(false);
  const focus = isZone(view) ? view : null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [tv, setTv] = useState(false);
  const [calm, setCalm] = useState(false);
  const [fridge, setFridge] = useState(false);
  // Preferencias de espacio: ocultar menú lateral del dashboard y/o la columna de alertas.
  const [sidebarOff, setSidebarOff] = useState(false);
  const [panelOff, setPanelOff] = useState(false);
  const { snapshot, conn, diff, error } = useMonitorDashboard(fecha, demo);

  useEffect(() => {
    const small = window.matchMedia("(max-width: 900px)").matches;
    if (small) setView("list");
    setSidebarOff(localStorage.getItem("tammy.ops.sidebar") !== "on");
    setPanelOff(localStorage.getItem("tammy.ops.panel") !== "on");
  }, []);

  function toggleSidebar() {
    setSidebarOff((v) => { localStorage.setItem("tammy.ops.sidebar", v ? "on" : "off"); return !v; });
  }
  function togglePanel() {
    setPanelOff((v) => { localStorage.setItem("tammy.ops.panel", v ? "on" : "off"); return !v; });
  }

  // El menú lateral vive en el layout del dashboard (server); se oculta con una clase en <html>.
  useEffect(() => {
    const hide = sidebarOff || tv;
    document.documentElement.classList.toggle("tammy-ops-focus", hide);
    return () => document.documentElement.classList.remove("tammy-ops-focus");
  }, [sidebarOff, tv]);

  const alertIds = useMemo(() => new Set(snapshot?.alerts.map((a) => a.orderId) ?? []), [snapshot]);
  const selected: MonitorOrder | null = snapshot?.orders.find((o) => o.id === selectedId) ?? null;

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!snapshot || !q) return [];
    return snapshot.orders
      .filter((o) => `${o.code} ${o.customerName} ${o.endCustomerName ?? ""} ${o.items.map((i) => i.name).join(" ")}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [snapshot, q]);

  function locate(id: string) {
    setSelectedId(id);
    setSearchOpen(false);
    setView((v) => (window.matchMedia("(max-width: 900px)").matches ? "list" : v));
  }

  function onOverflow(zone: ZoneId) {
    const map: Record<ZoneId, MonitorFilter> = {
      pending: "pending",
      production: "production",
      stored: "stored",
      ready_dispatch: "ready_dispatch",
      delivered: "delivered",
    };
    setFilter(map[zone]);
    setView("list");
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
    setView(zone ?? "scene");
  }

  // Las tarjetas de sección abren su vista ampliada (y la cierran si ya está abierta); Alertas sigue filtrando.
  function onKpi(f: MonitorFilter) {
    if (isZone(f)) openFocus(view === f ? null : f);
    else setFilter(f);
  }

  const showPanel = focus ? prodAlerts : !panelOff;

  const sceneOrders = snapshot
    ? q
      ? snapshot.orders.filter((o) => `${o.code} ${o.customerName} ${o.endCustomerName ?? ""}`.toLowerCase().includes(q))
      : snapshot.orders
    : [];

  return (
    <div id="tammy-ops-root" className={`tammy-ops relative h-[100dvh] overflow-hidden ${calm ? "calm" : ""} ${tv ? "tv" : ""}`}>
      <div className={view === "list" ? "absolute inset-0" : "absolute inset-x-0 bottom-0 top-44"}>
        {!snapshot ? (
          <div className="flex h-full items-center justify-center text-sm text-[#9a837d]">Cargando obrador…</div>
        ) : view === "list" ? (
          <div className="h-full px-3 pb-3 pt-40">
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
            onFocus={openFocus}
            onSelect={locate}
            onOverflow={onOverflow}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-[#fff5f2] via-[#fff5f2]/95 to-transparent pb-3">
      <div className="pointer-events-auto">
      <MonitorHeader
        fecha={fecha}
        onFecha={setFecha}
        conn={conn}
        updatedAt={snapshot?.updatedAt}
        demo={demo}
        tv={tv}
        calm={calm}
        sidebarOff={sidebarOff || tv}
        panelOff={focus ? !prodAlerts : panelOff}
        onTv={() => setTv((v) => !v)}
        onCalm={() => setCalm((v) => !v)}
        onSidebar={toggleSidebar}
        onPanel={() => (focus ? setProdAlerts((v) => !v) : togglePanel())}
        onFullscreen={fullscreen}
      />
      {snapshot && <MonitorKpiBar kpis={snapshot.kpis} filter={focus ?? filter} onFilter={onKpi} />}
      {error && conn !== "live" && (
        <p className="px-3 text-xs text-amber-800">
          {conn === "stale" ? "Mostrando último snapshot válido. " : ""}{error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 px-3 pb-1">
            <div className="relative min-w-[240px] flex-1">
              <div className="glass flex h-10 items-center gap-2 rounded-xl px-3">
                <Search className="h-4 w-4 text-[#9a837d]" />
                <input
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
                  onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && results[0]) locate(results[0].id); if (e.key === "Escape") { setQuery(""); setSearchOpen(false); } }}
                  placeholder="Buscar código, cliente o producto…"
                  className="h-full flex-1 bg-transparent text-sm text-[#3f2b25] outline-none placeholder:text-[#b59d97]"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="rounded p-0.5 text-[#9a837d] hover:bg-rose-50" aria-label="Limpiar">
                    <X className="h-3.5 w-3.5" />
                  </button>
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
                        onClick={() => locate(o.id)}
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
              <Seg active={view === "scene"} onClick={() => setView("scene")} icon={<LayoutGrid className="h-3.5 w-3.5" />}>Escena</Seg>
              <Seg active={view === "production"} onClick={() => openFocus("production")} icon={<ChefHat className="h-3.5 w-3.5" />}>Producción</Seg>
              <Seg active={view === "list"} onClick={() => setView("list")} icon={<ListIcon className="h-3.5 w-3.5" />}>Lista</Seg>
            </div>
            <div className="glass flex items-center rounded-xl p-1">
              <Seg active={fridge} onClick={() => setFridge(true)} icon={<Snowflake className="h-3.5 w-3.5" />}>Heladeras</Seg>
            </div>
          </div>
      </div>
      </div>

      {snapshot && (
        <p className="pointer-events-none absolute bottom-1 left-3 z-20 text-[10px] text-[#b59d97]">{snapshot.dispatchHeuristic}</p>
      )}

      <div className="pointer-events-none absolute inset-0 z-30 [&>*]:pointer-events-auto">
        {snapshot && !showPanel && (
          <button
            type="button"
            onClick={() => (focus ? setProdAlerts(true) : togglePanel())}
            className="glass absolute right-3 top-48 hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-[#6f5750] hover:bg-rose-50 lg:flex"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-[#d9453d]" />
            Alertas{snapshot.alerts.length ? ` · ${snapshot.alerts.length}` : ""}
          </button>
        )}
        {snapshot && !showPanel && selected && (
          <div className="absolute bottom-3 right-3 hidden w-[340px] lg:block" style={{ height: "min(78dvh, 720px)" }}>
            <OrderDetailDrawer order={selected} tv={tv} alert={alertIds.has(selected.id)} onClose={() => setSelectedId(null)} />
          </div>
        )}
        {snapshot && showPanel && (
          <div className="absolute bottom-3 right-3 top-48 hidden w-[340px] flex-col gap-3 lg:flex">
            <button
              type="button"
              onClick={() => (focus ? setProdAlerts(false) : togglePanel())}
              className="glass flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold text-[#6f5750] hover:bg-rose-50"
            >
              <ChevronsRight className="h-3.5 w-3.5" /> Minimizar alertas
            </button>
            {selected ? (
              <>
                <div className="min-h-0 flex-1">
                  <OrderDetailDrawer order={selected} tv={tv} alert={alertIds.has(selected.id)} onClose={() => setSelectedId(null)} />
                </div>
                <AlertStrip alerts={snapshot.alerts} onSelect={locate} selectedId={selectedId} compact />
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                <AlertStrip alerts={snapshot.alerts} onSelect={locate} selectedId={selectedId} />
                <RangoWidget orders={snapshot.orders} />
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
        <FridgeZoom locations={snapshot.locations} orders={snapshot.orders} onSelect={locate} onClose={() => setFridge(false)} />
      )}
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
