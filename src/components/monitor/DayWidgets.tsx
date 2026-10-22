"use client";

import { ChefHat, Clock, Package } from "lucide-react";
import type { MonitorOrder } from "@/lib/monitor/types";
import { RANGO_SHORT } from "@/lib/monitor/types";
import { dayProgress, rangoBuckets, unitsToProduce, type RangoBucket } from "@/lib/monitor/selectors";
import { getRangoLabel } from "@/lib/utils";
import { STATUS_META } from "./ui";

const C = {
  delivered: STATUS_META.delivered.color,
  ready: STATUS_META.stored.color,
  production: STATUS_META.production.color,
  pending: STATUS_META.pending.color,
};

/**
 * Resumen del día en una línea: avance en potes (retirados / en heladera / en producción / por hacer),
 * pedidos por franja horaria y lo que falta producir por producto.
 */
export function DaySummary({
  orders,
  dayLabel,
  currentRango,
  onProduction,
}: {
  orders: MonitorOrder[];
  dayLabel: string;
  /** Rango en curso, solo si se está viendo hoy. */
  currentRango: string | null;
  onProduction: () => void;
}) {
  const p = dayProgress(orders);
  const toProduce = unitsToProduce(orders);
  const done = p.ready + p.delivered;
  const pct = p.total ? Math.round((done / p.total) * 100) : 0;
  const seg = (n: number) => `${p.total ? (n / p.total) * 100 : 0}%`;
  const top = toProduce.slice(0, 3);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 pb-1.5">
      <div className="glass flex min-w-[300px] flex-[1.2] items-center gap-3 rounded-xl px-3 py-1.5">
        <div className="shrink-0 leading-tight">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9a837d]">{dayLabel}</p>
          <p className="text-[13px] text-[#3f2b25]">
            <span className="plate text-base font-bold">{p.total}</span> potes
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-[#f6e9e4]" title="Retirados · en heladera · en producción · por hacer">
            <div style={{ width: seg(p.delivered), background: C.delivered }} />
            <div style={{ width: seg(p.ready), background: C.ready }} />
            <div style={{ width: seg(p.production), background: C.production }} />
            <div style={{ width: seg(p.pending), background: C.pending, opacity: 0.55 }} />
          </div>
          <p className="mt-1 flex flex-wrap gap-x-3 text-[11.5px] text-[#6f5750]">
            <span><b className="plate text-[#3f2b25]">{done}</b> listos ({pct}%)</span>
            <span><Dot c={C.delivered} /><b className="plate">{p.delivered}</b> retirados</span>
            <span><Dot c={C.ready} /><b className="plate">{p.ready}</b> en heladera</span>
            <span><Dot c={C.production} /><b className="plate">{p.production}</b> en producción</span>
            <span><Dot c={C.pending} /><b className="plate">{p.pending}</b> por hacer</span>
          </p>
        </div>
      </div>

      <div className="glass hidden items-center gap-2 rounded-xl px-3 py-1.5 md:flex" title="Pedidos por franja horaria">
        <Clock className="h-3.5 w-3.5 shrink-0 text-[#d99a2b]" />
        <MiniRangoChart buckets={rangoBuckets(orders)} currentRango={currentRango} />
      </div>

      <button
        type="button"
        onClick={onProduction}
        title="Ver producción"
        className="glass flex min-w-[240px] flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left text-[12.5px] text-[#6f5750] transition hover:bg-[#fff7f4]"
      >
        <ChefHat className="h-4 w-4 shrink-0" style={{ color: C.production }} />
        {top.length === 0 ? (
          <span className="font-medium text-[#3f2b25]">Nada por producir</span>
        ) : (
          <span className="min-w-0 truncate">
            <span className="font-semibold text-[#3f2b25]">Falta producir: </span>
            {top.map((r, i) => (
              <span key={r.name}>
                {i > 0 && " · "}
                <b className="plate text-[#3f2b25]">{r.total}</b> {r.name}
              </span>
            ))}
            {toProduce.length > 3 && <span className="text-[#9a837d]"> · +{toProduce.length - 3} más</span>}
          </span>
        )}
      </button>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: c }} />;
}

/** Barras chicas por franja: alto = pedidos; verde retirados, celeste en heladera, rosa por hacer. */
function MiniRangoChart({ buckets, currentRango }: { buckets: RangoBucket[]; currentRango: string | null }) {
  if (buckets.length === 0) return <span className="text-[11px] text-[#9a837d]">Sin pedidos</span>;
  const max = Math.max(1, ...buckets.map((b) => b.orders));
  return (
    <div className="flex items-end gap-1.5">
      {buckets.map((b) => {
        const now = b.rango === currentRango;
        return (
          <div key={b.rango} className="flex w-7 flex-col items-center" title={`${getRangoLabel(b.rango)}: ${b.orders} pedidos · ${b.units} potes`}>
            <span className="plate text-[10px] leading-none text-[#6f5750]">{b.orders}</span>
            <div className={`mt-0.5 flex h-6 w-3.5 flex-col-reverse overflow-hidden rounded-sm bg-[#f6e9e4] ${now ? "ring-2 ring-[#d99a2b] ring-offset-1" : ""}`}>
              <StackedBar b={b} max={max} />
            </div>
            <span className={`mt-0.5 text-[9.5px] leading-none ${now ? "font-bold text-[#b9781a]" : "text-[#9a837d]"}`}>{RANGO_SHORT[b.rango] ?? b.rango}</span>
          </div>
        );
      })}
    </div>
  );
}

function StackedBar({ b, max }: { b: RangoBucket; max: number }) {
  const h = (n: number) => `${(n / max) * 100}%`;
  return (
    <>
      <div style={{ height: h(b.delivered), background: C.delivered }} />
      <div style={{ height: h(b.ready), background: C.ready }} />
      <div style={{ height: h(b.todo), background: C.pending }} />
    </>
  );
}

/** Carga por franja horaria: barras verticales para ver de un vistazo las horas pico de retiro. */
export function RangoWidget({ orders, currentRango }: { orders: MonitorOrder[]; currentRango: string | null }) {
  const buckets = rangoBuckets(orders);
  const max = Math.max(1, ...buckets.map((b) => b.orders));

  return (
    <section className="glass-strong rounded-[22px] px-4 py-3">
      <header className="mb-2 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#fff1d6] text-[#d99a2b]"><Clock className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-semibold text-[#3f2b25]">Carga por franja horaria</p>
          <p className="text-[11px] text-[#9a837d]">Pedidos por horario de retiro</p>
        </div>
      </header>
      {buckets.length === 0 ? (
        <p className="text-xs text-[#9a837d]">Sin pedidos para esta fecha.</p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-1">
            {buckets.map((b) => {
              const now = b.rango === currentRango;
              return (
                <div key={b.rango} className="flex flex-1 flex-col items-center" title={`${getRangoLabel(b.rango)}: ${b.units} potes`}>
                  <span className="plate text-[11px] text-[#3f2b25]">{b.orders}</span>
                  <div className={`mt-0.5 flex h-20 w-full max-w-[26px] flex-col-reverse overflow-hidden rounded-md bg-[#f6e9e4] ${now ? "ring-2 ring-[#d99a2b] ring-offset-1" : ""}`}>
                    <StackedBar b={b} max={max} />
                  </div>
                  <span className={`mt-1 text-[10px] ${now ? "font-bold text-[#b9781a]" : "text-[#9a837d]"}`}>{RANGO_SHORT[b.rango] ?? b.rango}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3 text-[10.5px] text-[#9a837d]">
            <span><Dot c={C.delivered} />retirados</span>
            <span><Dot c={C.ready} />en heladera</span>
            <span><Dot c={C.pending} />por hacer</span>
            {currentRango && <span className="font-semibold text-[#b9781a]">▢ horario actual</span>}
          </p>
        </>
      )}
    </section>
  );
}

/** Potes que faltan producir por producto: por hacer (rosa) y ya en producción (ámbar). */
export function LoadWidget({ orders }: { orders: MonitorOrder[] }) {
  const rows = unitsToProduce(orders).slice(0, 10);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <section className="glass-strong rounded-[22px] px-4 py-3">
      <header className="mb-2 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#fde8ea] text-[#e0707f]"><Package className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-semibold text-[#3f2b25]">Falta producir</p>
          <p className="text-[11px] text-[#9a837d]">Potes por producto · por hacer y en producción</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="text-xs text-[#9a837d]">Nada por producir.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-2 text-[12px]" title={`${r.pending} por hacer · ${r.production} en producción`}>
              <span className="w-28 truncate text-[#3f2b25]">{r.name}</span>
              <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-[#f6e9e4]">
                <div style={{ width: `${(r.production / max) * 100}%`, background: C.production }} />
                <div style={{ width: `${(r.pending / max) * 100}%`, background: C.pending }} />
              </div>
              <span className="plate w-8 text-right text-[#3f2b25]">{r.total}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
