"use client";

import { Snowflake, X } from "lucide-react";
import type { MonitorLocation, MonitorOrder } from "@/lib/monitor/types";

export function FridgeZoom({
  locations,
  orders,
  onSelect,
  onClose,
}: {
  locations: MonitorLocation[];
  orders: MonitorOrder[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#3f2b25]/40 p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong max-h-full w-full max-w-4xl overflow-auto rounded-[24px] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e2f3f8] text-[#3f98b2]"><Snowflake className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold text-[#3f2b25]">Heladeras</h3>
              <p className="label-caps">Ubicaciones reales cargadas en los pedidos del día</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-[#9a837d] hover:bg-rose-50"><X className="h-4 w-4" /></button>
        </div>
        {locations.length === 0 ? (
          <p className="text-sm text-[#6f5750]">Ubicación sin configurar: ningún pedido de este día tiene heladera/estante cargado.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {locations.map((loc) => {
              const inside = orders.filter((o) => o.placements.some((p) => p.fridgeId === loc.id));
              const units = inside.reduce((s, o) => s + o.unitsOrdered, 0);
              return (
                <div key={loc.id} className="glass rounded-2xl p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold text-[#2f6d7c]">{loc.name}</p>
                    <p className="plate text-sm text-[#3f98b2]">{units}u</p>
                  </div>
                  <p className="label-caps">{inside.length} pedido{inside.length === 1 ? "" : "s"} · sin capacidad registrada</p>
                  <ul className="mt-3 space-y-1">
                    {inside.map((o) => {
                      const shelf = o.placements.find((p) => p.fridgeId === loc.id)?.shelfId;
                      return (
                        <li key={o.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[#f4fbfd]"
                            onClick={() => onSelect(o.id)}
                          >
                            <span className="plate text-[#3f2b25]">{o.code}</span>
                            {shelf && <span className="rounded bg-[#e2f3f8] px-1.5 py-0.5 text-[10px] font-bold text-[#3f98b2]">Est. {shelf}</span>}
                            <span className="min-w-0 flex-1 truncate text-[#6f5750]">{o.endCustomerName ?? o.customerName}</span>
                            <span className="plate text-xs text-[#9a837d]">{o.unitsOrdered}u</span>
                          </button>
                        </li>
                      );
                    })}
                    {inside.length === 0 && <li className="text-xs text-[#9a837d]">Vacía</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
