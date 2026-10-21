"use client";

import type { MonitorAlert } from "@/lib/monitor/types";

export function AlertStrip({ alerts, onSelect }: { alerts: MonitorAlert[]; onSelect: (orderId: string) => void }) {
  if (alerts.length === 0) {
    return (
      <div className="mx-4 mb-3 rounded-2xl bg-white/80 px-4 py-2 text-xs text-[#7a5550]">
        Sin alertas para esta fecha
      </div>
    );
  }
  return (
    <div className="mx-4 mb-3 flex gap-2 overflow-x-auto">
      {alerts.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelect(a.orderId)}
          className={`shrink-0 rounded-2xl px-3 py-2 text-left text-xs ${a.severity === "critical" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}
        >
          <span className="font-semibold">{a.title}</span>
          <span className="mt-0.5 block opacity-80">{a.detail}</span>
        </button>
      ))}
    </div>
  );
}
