"use client";

import { Maximize2, CalendarDays, Tv, Wind, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { ConnState } from "./useMonitorDashboard";

export function MonitorHeader({
  fecha,
  onFecha,
  conn,
  updatedAt,
  demo,
  tv,
  calm,
  sidebarOff,
  panelOff,
  onTv,
  onCalm,
  onSidebar,
  onPanel,
  onFullscreen,
}: {
  fecha: string;
  onFecha: (v: string) => void;
  conn: ConnState;
  updatedAt?: string;
  demo: boolean;
  tv: boolean;
  calm: boolean;
  sidebarOff: boolean;
  panelOff: boolean;
  onTv: () => void;
  onCalm: () => void;
  onSidebar: () => void;
  onPanel: () => void;
  onFullscreen: () => void;
}) {
  const label = conn === "live" ? "En vivo · 15 s" : conn === "connecting" ? "Conectando" : conn === "stale" ? "Datos desactualizados" : "Sin conexión";
  const color = conn === "live" ? "#3fa36b" : conn === "stale" ? "#d99a2b" : conn === "offline" ? "#d9453d" : "#9a837d";
  const hora = updatedAt
    ? new Date(updatedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "";

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-pink-200 to-rose-300 text-xl shadow-sm">🧁</div>
        <div>
          <p className="font-serif text-xl font-semibold leading-none text-[#d45a78]">Tammy Ops</p>
          <p className="label-caps mt-1">Centro de control del obrador</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {demo && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">MODO DEMO</span>}
        <label className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-[#6f5750]">
          <CalendarDays className="h-3.5 w-3.5 text-[#c45b72]" />
          <input type="date" value={fecha} onChange={(e) => onFecha(e.target.value)} className="bg-transparent text-sm font-medium text-[#3f2b25] outline-none" />
        </label>
        <span className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-[#6f5750]">
          <span className="relative flex h-2.5 w-2.5">
            {conn === "live" && <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: color }} />}
            <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          </span>
          <span className="font-medium text-[#3f2b25]">{label}</span>
          {hora && <span className="plate text-[#9a837d]">{hora}</span>}
        </span>
        <div className="glass hidden items-center gap-0.5 rounded-full p-1 lg:flex">
          <HBtn label={sidebarOff ? "Mostrar menú lateral" : "Ocultar menú lateral"} active={sidebarOff} onClick={onSidebar}>
            {sidebarOff ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </HBtn>
          <HBtn label={panelOff ? "Mostrar alertas y resumen" : "Ocultar alertas y resumen"} active={panelOff} onClick={onPanel}>
            {panelOff ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
          </HBtn>
        </div>
        <div className="glass flex items-center gap-0.5 rounded-full p-1">
          <HBtn label={tv ? "Modo mesa" : "Modo TV"} active={tv} onClick={onTv}><Tv className="h-4 w-4" /></HBtn>
          <HBtn label={calm ? "Ambiente" : "Modo calma"} active={calm} onClick={onCalm}><Wind className="h-4 w-4" /></HBtn>
          <HBtn label="Pantalla completa" onClick={onFullscreen}><Maximize2 className="h-4 w-4" /></HBtn>
        </div>
      </div>
    </header>
  );
}

function HBtn({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-full text-[#6f5750] transition hover:bg-rose-50 ${active ? "bg-rose-100 text-[#c45b72]" : ""}`}
    >
      {children}
    </button>
  );
}
