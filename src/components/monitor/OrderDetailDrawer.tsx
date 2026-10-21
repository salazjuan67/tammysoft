"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { MonitorOrder } from "@/lib/monitor/types";
import { getRangoLabel } from "@/lib/utils";
import { sceneStatus } from "@/lib/monitor/selectors";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  production: "En producción",
  stored: "En heladera",
  ready_dispatch: "Listo para despacho (heurística)",
  delivered: "Entregado",
};

export function OrderDetailDrawer({
  order,
  tv,
  onClose,
}: {
  order: MonitorOrder | null;
  tv: boolean;
  onClose: () => void;
}) {
  if (!order) return null;
  const place = order.placements[0];
  return (
    <aside className="flex h-full w-full max-w-sm flex-col border-l border-[#ead7cf] bg-white/95 shadow-xl">
      <div className="flex items-start justify-between gap-2 border-b border-[#f3e4de] px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#c45b72]">Pedido seleccionado</p>
          <h2 className="text-xl font-bold">{order.code}</h2>
          <p className="text-sm text-[#7a5550]">{STATUS_LABEL[order.status] ?? order.rawEstado}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        <Row label="Cliente" value={order.customerName} />
        {!tv && order.endCustomerName && <Row label="Cliente final" value={order.endCustomerName} />}
        <Row label="Productos" value={order.items.map((i) => `${i.name} x${i.units}`).join(" · ")} />
        <Row label="Unidades" value={`${order.unitsOrdered} potes`} />
        <Row label="Entrega" value={getRangoLabel(order.rangoHorario)} />
        <Row label="Ubicación" value={place ? `Heladera ${place.fridgeId}${place.shelfId ? ` · Estante ${place.shelfId}` : ""}` : "Sin ubicación"} />
        {!tv && order.notes && <Row label="Notas" value={order.notes} />}
        <div>
          <p className="mb-1 text-xs font-semibold text-[#7a5550]">Historial (timestamps reales)</p>
          {order.timeline.length === 0 ? (
            <p className="text-xs text-gray-400">No hay más eventos registrados.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {order.timeline.map((ev) => (
                <li key={ev.source + ev.at}>
                  {new Date(ev.at).toLocaleString("es-AR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })} · {ev.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex gap-2 border-t border-[#f3e4de] p-3">
        <Link href="/dashboard/pedidos" className="flex-1 rounded-xl bg-pink-600 py-2 text-center text-sm font-semibold text-white">Ver pedidos</Link>
        {sceneStatus(order) !== "delivered" && (
          <Link href="/dashboard/produccion" className="flex-1 rounded-xl border border-pink-200 py-2 text-center text-sm font-semibold text-pink-700">Ir a producción</Link>
        )}
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a07872]">{label}</p>
      <p className="text-[#4a342c]">{value}</p>
    </div>
  );
}
