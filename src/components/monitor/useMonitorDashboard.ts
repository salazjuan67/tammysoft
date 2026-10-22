"use client";

import { useEffect, useRef, useState } from "react";
import type { MonitorSnapshot } from "@/lib/monitor/types";
import { demoSnapshot } from "@/lib/monitor/demo";
import { diffOrders, type OrderDiff } from "@/lib/monitor/diff";

export type ConnState = "live" | "connecting" | "offline" | "stale";

/** Sin tiempo real (o en demo) se consulta cada 15 s; con tiempo real solo para refrescar alertas que dependen de la hora. */
const POLL_MS = 15_000;
const REALTIME_REFRESH_MS = 60_000;

/**
 * Snapshot del día. Escucha /api/monitor/stream (SSE) y recarga apenas cambia un pedido;
 * si el stream se cae vuelve a consultar cada 15 s. Pausado con la pestaña oculta.
 * `fecha` vacía (antes de hidratar) no carga nada.
 */
export function useMonitorDashboard(fecha: string, demo: boolean) {
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [status, setStatus] = useState<{ fecha: string; conn: ConnState }>({ fecha: "", conn: "connecting" });
  const [diff, setDiff] = useState<OrderDiff>({ entered: [], left: [], moved: [] });
  const [error, setError] = useState<string | null>(null);
  const [realtime, setRealtime] = useState(false);
  const prevRef = useRef<MonitorSnapshot | null>(null);

  useEffect(() => {
    if (!fecha) return;
    let alive = true;
    let busy = false;
    let again = false;
    let lastLoad = 0;
    let streamOpen = false;

    async function load() {
      if (document.hidden) return;
      if (busy) {
        again = true;
        return;
      }
      busy = true;
      try {
        let next: MonitorSnapshot;
        if (demo && process.env.NODE_ENV !== "production") {
          await Promise.resolve();
          next = demoSnapshot(fecha);
        } else {
          const res = await fetch(`/api/monitor?${new URLSearchParams({ fecha })}`, { cache: "no-store" });
          if (!res.ok) throw new Error("No se pudo cargar el monitor");
          next = (await res.json()).data as MonitorSnapshot;
        }
        if (!alive) return;
        lastLoad = Date.now();
        setDiff(diffOrders(prevRef.current?.orders, next.orders));
        prevRef.current = next;
        setSnapshot(next);
        setStatus({ fecha, conn: "live" });
        setError(null);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Error de red");
        setStatus({ fecha, conn: prevRef.current ? "stale" : "offline" });
      } finally {
        busy = false;
        if (again && alive) {
          again = false;
          load();
        }
      }
    }

    load();

    let es: EventSource | null = null;
    if (!demo && typeof EventSource !== "undefined") {
      es = new EventSource("/api/monitor/stream");
      let hellos = 0;
      // Al reconectar se recarga una vez por si hubo cambios mientras estaba caído.
      es.addEventListener("hello", () => {
        streamOpen = true;
        setRealtime(true);
        if (hellos++ > 0) load();
      });
      es.addEventListener("change", () => load());
      es.onerror = () => {
        streamOpen = false;
        setRealtime(false);
      };
    }

    const id = setInterval(() => {
      if (!streamOpen || Date.now() - lastLoad >= REALTIME_REFRESH_MS) load();
    }, POLL_MS);
    const onVis = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      es?.close();
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fecha, demo]);

  const conn: ConnState = status.fecha === fecha ? status.conn : "connecting";
  return { snapshot, conn, diff, error, realtime: realtime && !demo };
}
