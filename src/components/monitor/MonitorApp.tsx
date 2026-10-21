"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fechaKey } from "@/lib/monitor/time";
import type { MonitorFilter, MonitorOrder } from "@/lib/monitor/types";
import { unitsByProduct } from "@/lib/monitor/selectors";
import type { ZoneId } from "@/lib/monitor/layout";
import { useMonitorDashboard } from "./useMonitorDashboard";
import { MonitorHeader } from "./MonitorHeader";
import { MonitorKpiBar } from "./MonitorKpiBar";
import { KitchenScene } from "./KitchenScene";
import { MonitorList } from "./MonitorList";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import { AlertStrip } from "./AlertStrip";
import { FridgeZoom } from "./FridgeZoom";
import "./monitor.css";

export function MonitorApp() {
  const search = useSearchParams();
  const demo = search.get("demo") === "1" && process.env.NODE_ENV !== "production";
  const [fecha, setFecha] = useState(fechaKey());
  const [filter, setFilter] = useState<MonitorFilter>("all");
  const [view, setView] = useState<"scene" | "list">("scene");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tv, setTv] = useState(false);
  const [calm, setCalm] = useState(false);
  const [fridge, setFridge] = useState(false);
  const [load, setLoad] = useState(false);
  const { snapshot, conn, diff, error } = useMonitorDashboard(fecha, demo);

  useEffect(() => {
    const small = window.matchMedia("(max-width: 900px)").matches;
    if (small) setView("list");
  }, []);

  const alertIds = useMemo(() => new Set(snapshot?.alerts.map((a) => a.orderId) ?? []), [snapshot]);
  const selected: MonitorOrder | null = snapshot?.orders.find((o) => o.id === selectedId) ?? null;

  function locate(id: string) {
    setSelectedId(id);
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

  const carga = snapshot ? unitsByProduct(snapshot.orders).slice(0, 8) : [];

  return (
    <div id="tammy-ops-root" className={`tammy-ops flex h-[100dvh] flex-col ${calm ? "calm" : ""} ${tv ? "tv" : ""}`}>
      <MonitorHeader
        fecha={fecha}
        onFecha={setFecha}
        conn={conn}
        updatedAt={snapshot?.updatedAt}
        demo={demo}
        onFullscreen={fullscreen}
      />
      {snapshot && <MonitorKpiBar kpis={snapshot.kpis} filter={filter} onFilter={setFilter} />}
      {error && conn !== "live" && (
        <p className="px-4 text-xs text-amber-800">
          {conn === "stale" ? "Mostrando último snapshot válido. " : ""}{error}
        </p>
      )}
      <div className="flex min-h-0 flex-1 gap-3 px-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar código, cliente o producto"
              className="h-9 min-w-[200px] flex-1 rounded-xl border border-[#ead7cf] bg-white px-3 text-sm"
            />
            <button type="button" className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${view === "scene" ? "bg-pink-600 text-white" : "bg-white"}`} onClick={() => setView("scene")}>Escena</button>
            <button type="button" className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${view === "list" ? "bg-pink-600 text-white" : "bg-white"}`} onClick={() => setView("list")}>Lista</button>
            <button type="button" className="rounded-xl bg-white px-3 py-1.5 text-xs" onClick={() => setFridge(true)}>Heladeras</button>
            <button type="button" className="rounded-xl bg-white px-3 py-1.5 text-xs" onClick={() => setLoad((v) => !v)}>Carga por producto</button>
            <button type="button" className="rounded-xl bg-white px-3 py-1.5 text-xs" onClick={() => setCalm((v) => !v)}>{calm ? "Ambiente" : "Modo calma"}</button>
            <button type="button" className="rounded-xl bg-white px-3 py-1.5 text-xs" onClick={() => setTv((v) => !v)}>{tv ? "Modo mesa" : "Modo TV"}</button>
          </div>
          {load && (
            <div className="rounded-xl bg-white/90 px-3 py-2 text-xs">
              {carga.map(([name, n]) => (
                <span key={name} className="mr-3 inline-block"><strong>{n}</strong> {name}</span>
              ))}
              {carga.length === 0 && "Sin unidades pendientes"}
            </div>
          )}
          {!snapshot ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[#8b6b66]">Cargando obrador…</div>
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
              orders={query.trim()
                ? snapshot.orders.filter((o) => `${o.code} ${o.customerName} ${o.endCustomerName ?? ""}`.toLowerCase().includes(query.toLowerCase()))
                : snapshot.orders}
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
        </div>
        {selected && (
          <div className="hidden w-80 shrink-0 lg:block">
            <OrderDetailDrawer order={selected} tv={tv} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
      {selected && (
        <div className="lg:hidden">
          <OrderDetailDrawer order={selected} tv={tv} onClose={() => setSelectedId(null)} />
        </div>
      )}
      {snapshot && <AlertStrip alerts={snapshot.alerts} onSelect={locate} />}
      {fridge && snapshot && (
        <FridgeZoom locations={snapshot.locations} orders={snapshot.orders} onSelect={locate} onClose={() => setFridge(false)} />
      )}
      {snapshot && (
        <p className="px-4 pb-2 text-[10px] text-[#a07872]">{snapshot.dispatchHeuristic}</p>
      )}
    </div>
  );
}
