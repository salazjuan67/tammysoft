"use client";

import Link from "next/link";
import { X, User, Users, Clock, Snowflake, StickyNote, Package, ArrowUpRight } from "lucide-react";
import type { MonitorOrder } from "@/lib/monitor/types";
import { getRangoLabel } from "@/lib/utils";
import { sceneStatus } from "@/lib/monitor/selectors";
import { ALERT_COLOR, STATUS_META, StatusBadge, formatAgo, useNow } from "./ui";

export function OrderDetailDrawer({
  order,
  tv,
  alert,
  onClose,
}: {
  order: MonitorOrder | null;
  tv: boolean;
  alert?: boolean;
  onClose: () => void;
}) {
  const now = useNow();
  if (!order) return null;
  const place = order.placements[0];
  const meta = STATUS_META[order.status] ?? STATUS_META.unknown;
  const accent = alert ? ALERT_COLOR : meta.color;
  const last = order.timeline[order.timeline.length - 1];

  return (
    <aside className={`glass-strong flex h-full w-full flex-col overflow-hidden rounded-[22px] ${alert ? "alert-glow" : ""}`}>
      <div className="relative px-5 pb-4 pt-4" style={{ background: `linear-gradient(180deg, ${accent}1f, transparent)` }}>
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
        <div className="flex items-start justify-between gap-2">
          <StatusBadge status={order.status} alert={alert} />
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1 text-[#9a837d] hover:bg-white/70">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 className="plate mt-3 text-[34px] leading-none text-[#3f2b25]">{order.code}</h2>
        <p className="mt-1.5 truncate text-sm font-medium text-[#6f5750]">{order.endCustomerName ?? order.customerName}</p>
        {last && <p className="mt-0.5 text-[11px] text-[#9a837d]">{last.label} · hace {formatAgo(last.at, now)}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2 px-4">
        <Stat label="Potes" value={String(order.unitsOrdered)} />
        <Stat label="Productos" value={String(order.items.length)} />
        <Stat label="Entrega" value={shortRango(order.rangoHorario)} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-3">
        <p className="label-caps mb-1.5 px-1">Datos</p>
        <div className="glass divide-y divide-[#f6e9e4] rounded-2xl">
          <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Cliente" value={order.customerName} />
          {!tv && order.endCustomerName && <InfoRow icon={<Users className="h-3.5 w-3.5" />} label="Cliente final" value={order.endCustomerName} />}
          <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Horario" value={getRangoLabel(order.rangoHorario)} />
          <InfoRow
            icon={<Snowflake className="h-3.5 w-3.5" />}
            label="Ubicación"
            value={place ? `Heladera ${place.fridgeId}${place.shelfId ? ` · Estante ${place.shelfId}` : ""}` : "Sin ubicación"}
            muted={!place}
          />
          {!tv && order.notes && <InfoRow icon={<StickyNote className="h-3.5 w-3.5" />} label="Notas" value={order.notes} />}
        </div>

        <p className="label-caps mb-1.5 mt-4 px-1">Productos</p>
        <div className="glass rounded-2xl">
          {order.items.map((it, i) => (
            <div key={(it.id ?? it.name) + i} className="flex items-center gap-3 border-b border-[#f6e9e4] px-3 py-2 last:border-b-0">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-50 text-[#c45b72]"><Package className="h-3.5 w-3.5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-[#3f2b25]">{it.name}</span>
                {it.category && <span className="block text-[11px] text-[#9a837d]">{it.category}</span>}
              </span>
              <span className="plate text-sm text-[#3f2b25]">×{it.units}</span>
            </div>
          ))}
        </div>

        <p className="label-caps mb-1.5 mt-4 px-1">Historial · timestamps reales</p>
        {order.timeline.length === 0 ? (
          <p className="px-1 text-xs text-[#9a837d]">No hay más eventos registrados.</p>
        ) : (
          <ol className="relative ml-2 border-l border-[#f0dcd6] pl-4">
            {order.timeline.map((ev, i) => {
              const isLast = i === order.timeline.length - 1;
              return (
                <li key={ev.source + ev.at} className="relative pb-3 last:pb-0">
                  <span
                    className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white"
                    style={{ background: isLast ? accent : "#d9c3bc" }}
                  />
                  <p className="text-[13px] font-medium text-[#3f2b25]">{ev.label}</p>
                  <p className="text-[11px] text-[#9a837d]">
                    {new Date(ev.at).toLocaleString("es-AR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })} · hace {formatAgo(ev.at, now)}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="flex gap-2 border-t border-[#f3e4de] p-3">
        <Link href="/dashboard/pedidos" className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#d45a78] py-2 text-sm font-semibold text-white hover:bg-[#c04d6a]">
          Ver pedidos <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        {sceneStatus(order) !== "delivered" && (
          <Link href="/dashboard/produccion" className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-white py-2 text-sm font-semibold text-[#c45b72] hover:bg-rose-50">
            Producción <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </aside>
  );
}

function shortRango(r: string) {
  if (r === "SIN_ESPECIFICAR") return "—";
  const m = r.match(/^H(\d+)_(\d+)$/);
  return m ? `${m[1]}–${m[2]}h` : r;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl px-3 py-2">
      <p className="label-caps">{label}</p>
      <p className="plate mt-0.5 text-lg text-[#3f2b25]">{value}</p>
    </div>
  );
}

function InfoRow({ icon, label, value, muted }: { icon: React.ReactNode; label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#fbf1ee] text-[#9a837d]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="label-caps block">{label}</span>
        <span className={`block text-[13px] ${muted ? "italic text-[#9a837d]" : "text-[#3f2b25]"}`}>{value}</span>
      </span>
    </div>
  );
}
