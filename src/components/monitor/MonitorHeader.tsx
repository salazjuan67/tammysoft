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
  const label = conn === "live" ? "Actualización automática · 15 s" : conn === "connecting" ? "Conectando" : conn === "stale" ? "Datos desactualizados" : "Sin conexión";
  const color = conn === "live" ? "bg-emerald-500" : conn === "stale" ? "bg-amber-500" : conn === "offline" ? "bg-red-500" : "bg-gray-400";
  const hora = updatedAt
    ? new Date(updatedAt).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "long" })
    : "";

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 bg-white/80 px-5 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-pink-200 to-rose-300 text-xl shadow-sm">🧁</div>
        <div>
          <p className="font-serif text-xl font-semibold leading-none text-[#d45a78]">Postres Tammy</p>
          <p className="mt-1 text-[11px] text-[#9a7b76]">Tammy Ops Monitor · Producción · Pedidos · Heladeras · Despachos</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {demo && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">MODO DEMO</span>}
        <label className="flex items-center gap-2 rounded-full bg-[#fff7f4] px-3 py-1.5 text-xs text-[#8b6b66]">
          Hoy
          <input type="date" value={fecha} onChange={(e) => onFecha(e.target.value)} className="bg-transparent text-sm font-medium text-[#4a342c] outline-none" />
        </label>
        {hora && <span className="text-xs text-[#9a7b76]">{hora}</span>}
        <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs shadow-sm">
          <span className={`h-2 w-2 rounded-full ${color}`} />
          {label}
        </span>
        <button type="button" onClick={onFullscreen} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium shadow-sm">Pantalla completa</button>
      </div>
    </header>
  );
}
