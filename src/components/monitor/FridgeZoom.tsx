"use client";

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
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-6">
      <div className="max-h-full w-full max-w-3xl overflow-auto rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Heladeras (ubicaciones reales del día)</h3>
          <button type="button" onClick={onClose} className="text-sm text-pink-700">Cerrar</button>
        </div>
        {locations.length === 0 ? (
          <p className="text-sm text-gray-500">Ubicación sin configurar: ningún pedido de este día tiene heladera/estante cargado.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {locations.map((loc) => {
              const inside = orders.filter((o) => o.placements.some((p) => p.fridgeId === loc.id));
              return (
                <div key={loc.id} className="rounded-2xl border border-[#c5e8ef] bg-[#f4fbfd] p-3">
                  <p className="font-semibold text-[#2f6d7c]">{loc.name}</p>
                  <p className="text-xs text-[#5a8792]">{inside.reduce((s, o) => s + o.unitsOrdered, 0)} potes · sin capacidad registrada</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {inside.map((o) => {
                      const shelf = o.placements.find((p) => p.fridgeId === loc.id)?.shelfId;
                      return (
                        <li key={o.id}>
                          <button type="button" className="text-left hover:underline" onClick={() => onSelect(o.id)}>
                            {o.code} {shelf ? `· ${shelf}` : ""} · {o.unitsOrdered} u.
                          </button>
                        </li>
                      );
                    })}
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
