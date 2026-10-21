"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, LayoutGrid, List as ListIcon, Snowflake, X } from "lucide-react";
import { fechaKey } from "@/lib/monitor/time";
import type { MonitorFilter, MonitorOrder } from "@/lib/monitor/types";
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

export function MonitorApp() {
  const search = useSearchParams();
  const demo = search.get("demo") === "1" && process.env.NODE_ENV !== "production";
  const [fecha, setFecha] = useState(fechaKey());
  const [filter, setFilter] = useState<MonitorFilter>("all");
  const [view, setView] = useState<"scene" | "list">("scene");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [tv, setTv] = useState(false);
  const [calm, setCalm] = useState(false);
  const [fridge, setFridge] = useState(false);
  const { snapshot, conn, diff, error } = useMonitorDashboard(fecha, demo);

  useEffect(() => {
    const small = window.matchMedia("(max-width: 900px)").matches;
    if (small) setView("list");
  }, []);

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

  const sceneOrders = snapshot
    ? q
      ? snapshot.orders.filter((o) => `${o.code} ${o.customerName} ${o.endCustomerName ?? ""}`.toLowerCase().includes(q))
      : snapshot.orders
    : [];

  return (
    <div id="tammy-ops-root" className={`tammy-ops flex h-[100dvh] flex-col ${calm ? "calm" : ""} ${tv ? "tv" : ""}`}>
      <MonitorHeader
        fecha={fecha}
        onFecha={setFecha}
        conn={conn}
        updatedAt={snapshot?.updatedAt}
        demo={demo}
        tv={tv}
        calm={calm}
        onTv={() => setTv((v) => !v)}
        onCalm={() => setCalm((v) => !v)}
        onFullscreen={fullscreen}
      />
      {snapshot && <MonitorKpiBar kpis={snapshot.kpis} filter={filter} onFilter={setFilter} />}
      {error && conn !== "live" && (
        <p className="px-5 text-xs text-amber-800">
          {conn === "stale" ? "Mostrando último snapshot válido. " : ""}{error}
        </p>
      )}

      <div className="flex min-h-0 flex-1 gap-3 px-5 pb-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
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
              <Seg active={view === "list"} onClick={() => setView("list")} icon={<ListIcon className="h-3.5 w-3.5" />}>Lista</Seg>
            </div>
            <div className="glass flex items-center rounded-xl p-1">
              <Seg active={fridge} onClick={() => setFridge(true)} icon={<Snowflake className="h-3.5 w-3.5" />}>Heladeras</Seg>
            </div>
          </div>

          {!snapshot ? (
            <div className="glass flex flex-1 items-center justify-center rounded-[22px] text-sm text-[#9a837d]">Cargando obrador…</div>
          ) : view === "list" ? (
            <MonitorList
              orders={snapshot.orders}
              filter={filter}
              alertIds={alertIds}
              selectedId={selectedId}
              query={query}
              onSelect={locate}
            />
          ) : (
            <KitchenScene
              orders={sceneOrders}
              filter={filter}
              alertIds={alertIds}
              selectedId={selectedId}
              tv={tv}
              calm={calm}
              entering={diff.entered}
              onSelect={locate}
              onOverflow={onOverflow}
            />
          )}
          {snapshot && (
            <p className="px-1 text-[10px] text-[#b59d97]">{snapshot.dispatchHeuristic}</p>
          )}
        </div>

        {snapshot && (
          <div className="hidden w-[340px] shrink-0 flex-col gap-3 lg:flex">
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
