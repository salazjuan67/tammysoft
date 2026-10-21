"use client";

import type { MonitorFilter, MonitorOrder } from "@/lib/monitor/types";
import { matchesFilter, sceneStatus } from "@/lib/monitor/selectors";
import { getRangoLabel } from "@/lib/utils";

const LABEL: Record<string, string> = {
  pending: "Pendiente",
  production: "Producción",
  stored: "Heladera",
  ready_dispatch: "Despacho",
  delivered: "Entregado",
};

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
    <div className="min-h-0 flex-1 overflow-auto rounded-3xl border border-[#ead7cf] bg-white">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-[#fff7f4] text-left text-xs uppercase text-[#8b6b66]">
          <tr>
            <th className="px-3 py-2">Código</th>
            <th className="px-3 py-2">Cliente</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Unidades</th>
            <th className="px-3 py-2">Horario</th>
            <th className="px-3 py-2">Ubicación</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const p = o.placements[0];
            return (
              <tr
                key={o.id}
                onClick={() => onSelect(o.id)}
                className={`cursor-pointer border-t border-[#f3e4de] hover:bg-pink-50 ${selectedId === o.id ? "bg-pink-50" : ""}`}
              >
                <td className="px-3 py-2 font-semibold">{o.code}</td>
                <td className="px-3 py-2">{o.endCustomerName ?? o.customerName}</td>
                <td className="px-3 py-2">{LABEL[o.status] ?? sceneStatus(o)}</td>
                <td className="px-3 py-2">{o.unitsOrdered}</td>
                <td className="px-3 py-2">{getRangoLabel(o.rangoHorario)}</td>
                <td className="px-3 py-2">{p ? `H${p.fridgeId}${p.shelfId ? `/${p.shelfId}` : ""}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-12 text-center text-sm text-gray-400">No hay pedidos para este filtro</p>}
    </div>
  );
}
