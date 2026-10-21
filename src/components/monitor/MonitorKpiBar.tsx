"use client";

import { ClipboardList, ChefHat, Snowflake, Package, Truck, AlertTriangle, ChevronRight } from "lucide-react";
import type { MonitorFilter, MonitorKpis } from "@/lib/monitor/types";
import { ALERT_COLOR, AnimatedNumber, STATUS_META } from "./ui";

const ITEMS: Array<{ key: MonitorFilter; label: string; icon: typeof ClipboardList; color: string; field?: keyof Omit<MonitorKpis, "alerts"> }> = [
  { key: "pending", label: "Pendientes", icon: ClipboardList, color: STATUS_META.pending.color, field: "pending" },
  { key: "production", label: "En producción", icon: ChefHat, color: STATUS_META.production.color, field: "production" },
  { key: "stored", label: "Heladera", icon: Snowflake, color: STATUS_META.stored.color, field: "stored" },
  { key: "ready_dispatch", label: "Despacho", icon: Package, color: STATUS_META.ready_dispatch.color, field: "ready_dispatch" },
  { key: "delivered", label: "Entregados", icon: Truck, color: STATUS_META.delivered.color, field: "delivered" },
  { key: "alerts", label: "Alertas", icon: AlertTriangle, color: ALERT_COLOR },
];

export function MonitorKpiBar({ kpis, filter, onFilter }: { kpis: MonitorKpis; filter: MonitorFilter; onFilter: (f: MonitorFilter) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 px-3 py-1.5 lg:grid-cols-6">
      {ITEMS.map((item) => {
        const count = item.key === "alerts" ? kpis.alerts : item.field ? kpis[item.field].orders : 0;
        const units = item.field ? kpis[item.field].units : undefined;
        const active = filter === item.key;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onFilter(active ? "all" : item.key)}
            className={`glass flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition hover:-translate-y-0.5 ${active ? "ring-2 ring-offset-1" : ""}`}
            style={active ? { ["--tw-ring-color" as string]: item.color } : undefined}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${item.color}22`, color: item.color }}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <AnimatedNumber value={count} className="block text-xl font-bold leading-none text-[#3f2b25]" />
              <span className="mt-0.5 block truncate text-[12px] text-[#6f5750]">
                {item.label}{units != null ? <span className="text-[#9a837d]"> · {units} potes</span> : null}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#c9b3ad]" />
          </button>
        );
      })}
    </div>
  );
}
