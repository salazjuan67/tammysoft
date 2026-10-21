"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MonitorSnapshot } from "@/lib/monitor/types";
import { fechaKey } from "@/lib/monitor/time";
import { demoSnapshot } from "@/lib/monitor/demo";
import { diffOrders, type OrderDiff } from "@/lib/monitor/diff";

export type ConnState = "live" | "connecting" | "offline" | "stale";

export function useMonitorDashboard(fecha: string, demo: boolean) {
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [conn, setConn] = useState<ConnState>("connecting");
  const [diff, setDiff] = useState<OrderDiff>({ entered: [], left: [], moved: [] });
  const [error, setError] = useState<string | null>(null);
  const prevRef = useRef<MonitorSnapshot | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    if (typeof document !== "undefined" && document.hidden) return;
    inFlight.current = true;
    try {
      if (demo && process.env.NODE_ENV !== "production") {
        const next = demoSnapshot(fecha || fechaKey());
        setDiff(diffOrders(prevRef.current?.orders, next.orders));
        prevRef.current = next;
        setSnapshot(next);
        setConn("live");
        setError(null);
        return;
      }
      const qs = new URLSearchParams({ fecha: fecha || fechaKey() });
      const res = await fetch(`/api/monitor?${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar el monitor");
      const json = await res.json();
      const next = json.data as MonitorSnapshot;
      setDiff(diffOrders(prevRef.current?.orders, next.orders));
      prevRef.current = next;
      setSnapshot(next);
      setConn("live");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
      setConn(prevRef.current ? "stale" : "offline");
    } finally {
      inFlight.current = false;
    }
  }, [fecha, demo]);

  useEffect(() => {
    setConn("connecting");
    load();
    const id = setInterval(load, 15000);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  return { snapshot, conn, diff, error, reload: load };
}
