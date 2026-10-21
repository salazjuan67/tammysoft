"use client";

import type { MonitorFilter, MonitorKpis } from "@/lib/monitor/types";

const ITEMS: Array<{ key: MonitorFilter; label: string; color: string; field?: keyof Omit<MonitorKpis, "alerts"> }> = [
  { key: "pending", label: "Pendientes", color: "bg-[#f8d5d8] text-[#8a3d4a]", field: "pending" },
  { key: "production", label: "En producción", color: "bg-[#f6e0b8] text-[#7a5a18]", field: "production" },
  { key: "stored", label: "Heladera", color: "bg-[#d5eef4] text-[#2f6d7c]", field: "stored" },
  { key: "ready_dispatch", label: "Despacho", color: "bg-[#e4d7f6] text-[#5b3d86]", field: "ready_dispatch" },
  { key: "delivered", label: "Entregados", color: "bg-[#d4eedd] text-[#2f6b45]", field: "delivered" },
  { key: "alerts", label: "Alertas", color: "bg-[#fde2e0] text-[#9b2c2c]" },
];

export function MonitorKpiBar({
  kpis,
  filter,
  onFilter,
}: {
  kpis: MonitorKpis;
  filter: MonitorFilter;
  onFilter: (f: MonitorFilter) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2">
      {ITEMS.map((item) => {
        const count = item.key === "alerts" ? kpis.alerts : item.field ? kpis[item.field].orders : 0;
        const units = item.field ? kpis[item.field].units : undefined;
        const active = filter === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onFilter(active ? "all" : item.key)}
            className={`min-w-[132px] rounded-2xl px-4 py-3 text-left shadow-sm transition ${item.color} ${active ? "ring-2 ring-[#c45b72]" : ""}`}
          >
            <p className="text-[11px] font-medium opacity-80">{item.label}</p>
            <p className="text-2xl font-bold leading-tight">{count}</p>
            {units != null && <p className="text-[10px] opacity-70">{units} potes</p>}
          </button>
        );
      })}
    </div>
  );
}
