"use client";

import { useEffect, useRef, useState } from "react";
import type { MonitorStatus } from "@/lib/monitor/types";

export const STATUS_META: Record<string, { label: string; color: string; soft: string }> = {
  pending: { label: "Pendiente", color: "#e0707f", soft: "#fde8ea" },
  production: { label: "En producción", color: "#d99a2b", soft: "#fff1d6" },
  stored: { label: "En heladera", color: "#3f98b2", soft: "#e2f3f8" },
  ready_dispatch: { label: "Despacho", color: "#8a66c9", soft: "#eee7fa" },
  delivered: { label: "Entregado", color: "#3fa36b", soft: "#e3f5ea" },
  cancelled: { label: "Cancelado", color: "#9a837d", soft: "#f1ecea" },
  unknown: { label: "Sin clasificar", color: "#9a837d", soft: "#f1ecea" },
};
export const ALERT_COLOR = "#d9453d";

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const node = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  useEffect(() => {
    const from = previous.current;
    const to = value;
    previous.current = value;
    if (!node.current) return;
    if (from === to) { node.current.textContent = String(to); return; }
    const start = performance.now();
    const dur = 700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      if (node.current) node.current.textContent = String(Math.round(from + (to - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span ref={node} className={className}>0</span>;
}

export function StatusBadge({ status, alert }: { status: MonitorStatus; alert?: boolean }) {
  const meta = STATUS_META[status] ?? STATUS_META.unknown;
  const color = alert ? ALERT_COLOR : meta.color;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: alert ? "#fde4e2" : meta.soft, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {alert ? "Alerta · " : ""}{meta.label}
    </span>
  );
}

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);
    const raf = requestAnimationFrame(tick);
    return () => { clearInterval(id); cancelAnimationFrame(raf); };
  }, [intervalMs]);
  return now;
}

export function formatAgo(iso: string, now: number) {
  if (!now) return "—";
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}
