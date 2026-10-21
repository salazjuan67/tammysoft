"use client";

import type { ConnState } from "./useMonitorDashboard";

export function MonitorHeader({
  fecha,
  onFecha,
  conn,
  updatedAt,
  demo,
  onFullscreen,
}: {
  fecha: string;
  onFecha: (v: string) => void;
  conn: ConnState;
  updatedAt?: string;
  demo: boolean;
  onFullscreen: () => void;
}) {
  const label = conn === "live" ? "En vivo" : conn === "connecting" ? "Conectando" : conn === "stale" ? "Datos desactualizados" : "Sin conexión";
  const color = conn === "live" ? "bg-emerald-500" : conn === "stale" ? "bg-amber-500" : conn === "offline" ? "bg-red-500" : "bg-gray-400";
  const hora = updatedAt ? new Date(updatedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-pink-100 text-lg">🍰</div>
        <div>
          <p className="font-serif text-lg font-semibold text-[#c45b72]">Postres Tammy</p>
          <p className="text-xs text-[#8b6b66]">Tammy Ops Monitor · Producción · Pedidos · Heladeras · Despachos</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {demo && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">MODO DEMO</span>}
        <label className="text-xs text-[#8b6b66]">
          Fecha
          <input type="date" value={fecha} onChange={(e) => onFecha(e.target.value)} className="ml-2 rounded-lg border border-[#ead7cf] bg-white px-2 py-1 text-sm" />
        </label>
        <span className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs">
          <span className={`h-2 w-2 rounded-full ${color}`} />
          {label} · {hora}
        </span>
        <button type="button" onClick={onFullscreen} className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium shadow-sm">Pantalla completa</button>
      </div>
    </header>
  );
}
