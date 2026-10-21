"use client";

import type { MonitorOrder } from "@/lib/monitor/types";
import { sceneStatus } from "@/lib/monitor/selectors";
import type { SlotPos } from "@/lib/monitor/layout";
import { IsoCrate } from "./Iso";
import { ALERT_COLOR, STATUS_META } from "./ui";

const CRATE: Record<string, { fill: string; side: string }> = {
  pending: { fill: "#f6c9b7", side: "#d6957f" },
  production: { fill: "#f3d7a4", side: "#d4ae62" },
  stored: { fill: "#cfe8f2", side: "#86b7c8" },
  ready_dispatch: { fill: "#ddd0f2", side: "#a48bc8" },
  delivered: { fill: "#c8e8d4", side: "#7db894" },
};

export function OrderChip({
  order,
  slot,
  selected,
  alert,
  tv,
  dimmed,
  entering,
  showLabel,
  labelScale,
  onSelect,
}: {
  order: MonitorOrder;
  slot: SlotPos;
  selected: boolean;
  alert: boolean;
  tv: boolean;
  dimmed: boolean;
  entering?: boolean;
  showLabel: boolean;
  /** Factor inverso al zoom de la escena: las etiquetas mantienen tamaño legible en pantalla. */
  labelScale: number;
  onSelect: (id: string) => void;
}) {
  const zone = slot.zone === "ready_dispatch" ? "ready_dispatch" : sceneStatus(order);
  const crate = CRATE[zone] ?? CRATE.pending;
  const accent = alert ? ALERT_COLOR : (STATUS_META[zone]?.color ?? STATUS_META.pending.color);
  const full = order.endCustomerName ?? order.customerName;
  const name = full.split(" ").slice(0, tv ? 1 : 2).join(" ");
  const left = slot.x;
  const top = slot.y;

  if (slot.overflow) {
    return (
      <button
        type="button"
        onClick={() => onSelect("__overflow_" + slot.zone)}
        className="glass absolute rounded-full px-3 py-1.5 text-[12px] font-bold text-[#c45b72]"
        style={{ left, top: top + 20, transform: `scale(${labelScale})`, transformOrigin: "0 0" }}
      >
        + más pedidos
      </button>
    );
  }

  return (
    <button
      type="button"
      data-selected={selected}
      data-alert={alert}
      onClick={() => onSelect(order.id)}
      className={`tammy-ops-chip absolute w-[84px] text-left ${dimmed ? "opacity-25" : "opacity-100"} ${entering ? "animate-[ops-in_350ms_ease]" : ""}`}
      style={{ left, top, zIndex: selected ? 30 : 5, ["--accent" as string]: accent }}
    >
      <IsoCrate fill={crate.fill} side={crate.side} units={order.unitsOrdered} />
      {(showLabel || selected) && (
        <span
          className="slot-tag absolute left-1/2 top-0"
          style={{
            transformOrigin: "50% 100%",
            transform: `translate(-50%, calc(-100% - ${slot.stagger ? 38 : 4}px)) scale(${labelScale})`,
          }}
        >
          <span className="slot-tag__dot" />
          <span className="slot-tag__plate">{order.code}</span>
          <span className="slot-tag__meta">{name}</span>
          <span className="slot-tag__units">{order.unitsOrdered}u</span>
        </span>
      )}
      {zone === "delivered" && (
        <span className="absolute -right-1 top-2 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow">✓</span>
      )}
    </button>
  );
}
