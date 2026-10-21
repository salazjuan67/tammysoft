"use client";

import type { MonitorFilter, MonitorOrder } from "@/lib/monitor/types";
import { matchesFilter } from "@/lib/monitor/selectors";
import { getRangoLabel } from "@/lib/utils";
import { StatusBadge } from "./ui";

export function MonitorList({
  orders,
  filter,
  alertIds,
  selectedId,
  query,
  onSelect,
}: {
  orders: MonitorOrder[];
  filter: MonitorFilter;
  alertIds: Set<string>;
  selectedId: string | null;
  query: string;
  onSelect: (id: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const rows = orders.filter((o) => {
    if (!matchesFilter(o, filter, alertIds)) return false;
    if (!q) return true;
    return `${o.code} ${o.customerName} ${o.endCustomerName ?? ""} ${o.items.map((i) => i.name).join(" ")}`.toLowerCase().includes(q);
  });

  return (
    <div className="glass min-h-0 flex-1 overflow-auto rounded-[22px]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white/95 text-left backdrop-blur">
          <tr className="label-caps">
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Potes</th>
            <th className="px-4 py-3">Horario</th>
            <th className="px-4 py-3">Ubicación</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const p = o.placements[0];
            return (
              <tr
                key={o.id}
                onClick={() => onSelect(o.id)}
                className={`cursor-pointer border-t border-[#f6e9e4] transition hover:bg-[#fff7f4] ${selectedId === o.id ? "bg-[#fff1ee]" : ""}`}
              >
                <td className="plate px-4 py-2.5 text-[#3f2b25]">{o.code}</td>
                <td className="px-4 py-2.5">
                  <span className="block font-medium text-[#3f2b25]">{o.endCustomerName ?? o.customerName}</span>
                  {o.endCustomerName && <span className="block text-[11px] text-[#9a837d]">{o.customerName}</span>}
                </td>
                <td className="px-4 py-2.5"><StatusBadge status={o.status} alert={alertIds.has(o.id)} /></td>
                <td className="plate px-4 py-2.5 text-right">{o.unitsOrdered}</td>
                <td className="px-4 py-2.5 text-[#6f5750]">{getRangoLabel(o.rangoHorario)}</td>
                <td className="plate px-4 py-2.5 text-[#6f5750]">{p ? `H${p.fridgeId}${p.shelfId ? `/${p.shelfId}` : ""}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-12 text-center text-sm text-[#9a837d]">No hay pedidos para este filtro</p>}
    </div>
  );
}
