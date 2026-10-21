"use client";

import { AlertTriangle, Clock, Snowflake, Timer, ChevronRight, ShieldCheck } from "lucide-react";
import type { MonitorAlert, MonitorAlertKind } from "@/lib/monitor/types";

const KIND_ICON: Record<MonitorAlertKind, typeof Clock> = {
  delivery_soon: Clock,
  delivery_overdue: AlertTriangle,
  production_delayed: Timer,
  missing_location: Snowflake,
};

export function AlertStrip({
  alerts,
  onSelect,
  selectedId,
  compact,
}: {
  alerts: MonitorAlert[];
  onSelect: (orderId: string) => void;
  selectedId?: string | null;
  compact?: boolean;
}) {
  const critical = alerts.filter((a) => a.severity === "critical").length;
  return (
    <section className={`glass-strong flex min-h-0 flex-col overflow-hidden rounded-[22px] ${alerts.length ? "" : ""}`}>
      <header className="flex items-center gap-2.5 px-4 py-3">
        <span className={`grid h-8 w-8 place-items-center rounded-xl ${alerts.length ? "bg-[#fde4e2] text-[#d9453d]" : "bg-emerald-50 text-emerald-600"}`}>
          {alerts.length ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#3f2b25]">Alertas</p>
          <p className="text-[11px] text-[#9a837d]">
            {alerts.length === 0 ? "Todo en orden para esta fecha" : `${alerts.length} activa${alerts.length > 1 ? "s" : ""}${critical ? ` · ${critical} crítica${critical > 1 ? "s" : ""}` : ""}`}
          </p>
        </div>
        {alerts.length > 0 && <span className="plate rounded-full bg-[#fde4e2] px-2.5 py-0.5 text-sm text-[#d9453d]">{alerts.length}</span>}
      </header>
      {alerts.length > 0 && (
        <ul className={`min-h-0 flex-1 overflow-y-auto border-t border-[#f6e9e4] ${compact ? "max-h-44" : ""}`}>
          {alerts.map((a) => {
            const Icon = KIND_ICON[a.kind] ?? AlertTriangle;
            const color = a.severity === "critical" ? "#d9453d" : "#d99a2b";
            const active = selectedId === a.orderId;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onSelect(a.orderId)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[#fff7f4] ${active ? "bg-[#fff1ee]" : ""}`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${color}22`, color }}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[#3f2b25]">{a.title}</span>
                    <span className="block truncate text-[11px] text-[#6f5750]">{a.detail}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#c9b3ad]" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
