"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { ALERT_COLOR, STATUS_META } from "./ui";

const ROOMS: Array<{ key: string; name: string; text: string }> = [
  { key: "pending", name: "Pedidos", text: "Por hacer: todavía no empezó la producción." },
  { key: "production", name: "Producción", text: "En preparación en las mesas." },
  { key: "stored", name: "Heladera", text: "Listos, esperando que el cliente los retire (estante · código · cliente · potes)." },
  { key: "ready_dispatch", name: "Despacho", text: "En heladera y se retiran en este horario o el siguiente." },
  { key: "delivered", name: "Entregados", text: "Ya retirados por el cliente (botón Retirado en Pedidos)." },
];

/** Leyenda de salas, colores y marcas de las cajas, para quien recién empieza a usar el monitor. */
export function MonitorLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {open && (
        <div className="glass-strong absolute bottom-[calc(100%+8px)] left-0 w-[340px] rounded-2xl p-4 text-[12px] text-[#6f5750] shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#3f2b25]">Cómo leer el monitor</p>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-rose-50" aria-label="Cerrar leyenda">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="label-caps mb-1">Salas</p>
          <ul className="mb-3 space-y-1.5">
            {ROOMS.map((r) => (
              <li key={r.key} className="flex gap-2">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_META[r.key].color }} />
                <span><b className="text-[#3f2b25]">{r.name}</b> · {r.text}</span>
              </li>
            ))}
          </ul>
          <p className="label-caps mb-1">Cajas</p>
          <ul className="space-y-1.5">
            <li className="flex gap-2"><Swatch border="#e6a23c" /><span><b className="text-[#3f2b25]">Borde ámbar</b> · faltan menos de 2 h para el fin de su horario y todavía no está listo.</span></li>
            <li className="flex gap-2"><Swatch border={ALERT_COLOR} /><span><b className="text-[#3f2b25]">Borde rojo</b> · faltan menos de 30 min o ya venció.</span></li>
            <li className="flex gap-2"><Swatch glow={ALERT_COLOR} /><span><b className="text-[#3f2b25]">Latido rojo</b> · tiene una alerta (ver panel de alertas).</span></li>
            <li className="flex gap-2"><Swatch glow={STATUS_META.production.color} /><span><b className="text-[#3f2b25]">Brillo</b> · se entrega en el horario actual.</span></li>
            <li className="flex gap-2"><span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">✓</span><span>Retirado por el cliente.</span></li>
            <li className="flex gap-2"><span className="w-4 shrink-0 text-center">▤</span><span>Más pisos de caja = más potes (hasta 12, hasta 28, más de 28).</span></li>
          </ul>
          <p className="mt-3 text-[11px] text-[#9a837d]">Las personas de la escena son decorativas: no representan al personal real.</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#6f5750] hover:bg-rose-50 ${open ? "bg-rose-50" : ""}`}
      >
        <Info className="h-3.5 w-3.5 text-[#c45b72]" /> Leyenda
      </button>
    </div>
  );
}

function Swatch({ border, glow }: { border?: string; glow?: string }) {
  return (
    <span
      className="mt-0.5 h-4 w-4 shrink-0 rounded bg-[#f3d7a4]"
      style={{ border: border ? `2.5px solid ${border}` : undefined, boxShadow: glow ? `0 0 6px 2px ${glow}` : undefined }}
    />
  );
}
