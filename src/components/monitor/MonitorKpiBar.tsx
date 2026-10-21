"use client";

import type { MonitorFilter, MonitorKpis } from "@/lib/monitor/types";

const ITEMS: Array<{ key: MonitorFilter; label: string; wrap: string; field?: keyof Omit<MonitorKpis, "alerts"> }> = [
  { key: "pending", label: "Pendientes", wrap: "bg-[#fde8e8] text-[#b04a5a]", field: "pending" },
  { key: "production", label: "En producción", wrap: "bg-[#fff0d4] text-[#b07a1c]", field: "production" },
  { key: "stored", label: "Heladera", wrap: "bg-[#e4f4fa] text-[#2f7d92]", field: "stored" },
  { key: "ready_dispatch", label: "Despacho", wrap: "bg-[#efe6fb] text-[#6b4aa8]", field: "ready_dispatch" },
  { key: "delivered", label: "Entregados", wrap: "bg-[#e3f6ea] text-[#2f8a52]", field: "delivered" },
  { key: "alerts", label: "Alertas", wrap: "bg-[#fde4e2] text-[#c0392b]" },
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
    <div className="flex gap-2 overflow-x-auto px-5 py-3">
      {ITEMS.map((item) => {
        const count = item.key === "alerts" ? kpis.alerts : item.field ? kpis[item.field].orders : 0;
        const units = item.field ? kpis[item.field].units : undefined;
        const active = filter === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onFilter(active ? "all" : item.key)}
            className={`flex min-w-[140px] items-center gap-3 rounded-2xl px-4 py-2.5 text-left shadow-sm transition ${item.wrap} ${active ? "ring-2 ring-pink-400 ring-offset-2" : ""}`}
          >
            <span className="text-3xl font-bold leading-none">{count}</span>
            <span>
              <span className="block text-sm font-semibold">{item.label}</span>
              {units != null && <span className="text-[11px] opacity-70">{units} potes</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
