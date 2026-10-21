"use client";

import { Clock, Package } from "lucide-react";
import type { MonitorOrder } from "@/lib/monitor/types";
import { RANGO_ORDER } from "@/lib/monitor/types";
import { countByRango, unitsByProduct } from "@/lib/monitor/selectors";
import { getRangoLabel } from "@/lib/utils";
import { STATUS_META } from "./ui";

/** Distribución del día por rango horario: pedidos, potes y cuántos ya salieron. */
export function RangoWidget({ orders }: { orders: MonitorOrder[] }) {
  const byRango = countByRango(orders);
  const rows = RANGO_ORDER.filter((r) => byRango.has(r)).map((r) => {
    const all = orders.filter((o) => o.rangoHorario === r && o.status !== "cancelled");
    const delivered = all.filter((o) => o.status === "delivered").length;
    return { rango: r, ...byRango.get(r)!, delivered };
  });
  const max = Math.max(1, ...rows.map((r) => r.orders));

  return (
    <section className="glass-strong rounded-[22px] px-4 py-3">
      <header className="mb-2 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#fff1d6] text-[#d99a2b]"><Clock className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-semibold text-[#3f2b25]">Entregas por horario</p>
          <p className="text-[11px] text-[#9a837d]">Pedidos del día · entregados sobre total</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="text-xs text-[#9a837d]">Sin pedidos para esta fecha.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.rango}>
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="font-medium text-[#3f2b25]">{getRangoLabel(r.rango)}</span>
                <span className="plate text-[#6f5750]">
                  <span style={{ color: STATUS_META.delivered.color }}>{r.delivered}</span>/{r.orders}
                  <span className="ml-1.5 font-sans font-normal text-[#9a837d]">· {r.units} potes</span>
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#f6e9e4]">
                <div className="relative h-full rounded-full bg-[#f3c6cf]" style={{ width: `${(r.orders / max) * 100}%` }}>
                  <div className="h-full rounded-full" style={{ width: `${(r.delivered / r.orders) * 100}%`, background: STATUS_META.delivered.color }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Potes pendientes de salir (no entregados) agrupados por producto. */
export function LoadWidget({ orders }: { orders: MonitorOrder[] }) {
  const rows = unitsByProduct(orders).slice(0, 7);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <section className="glass-strong rounded-[22px] px-4 py-3">
      <header className="mb-2 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#fde8ea] text-[#e0707f]"><Package className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-semibold text-[#3f2b25]">Carga por producto</p>
          <p className="text-[11px] text-[#9a837d]">Potes aún no entregados</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="text-xs text-[#9a837d]">Todo entregado.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map(([name, n]) => (
            <li key={name} className="flex items-center gap-2 text-[12px]">
              <span className="w-28 truncate text-[#3f2b25]" title={name}>{name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f6e9e4]">
                <div className="h-full rounded-full bg-[#e0707f]" style={{ width: `${(n / max) * 100}%` }} />
              </div>
              <span className="plate w-8 text-right text-[#3f2b25]">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
