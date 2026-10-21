"use client";

import type { MonitorOrder } from "@/lib/monitor/types";
import { sceneStatus } from "@/lib/monitor/selectors";
import { FRIDGE, type SlotPos } from "@/lib/monitor/layout";
import { CRATE_W, crateHeight, IsoCrate } from "./Iso";
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
  hot,
  tv,
  dimmed,
  entering,
  enterDelay = 0,
  showLabel,
  labelScale,
  onSelect,
}: {
  order: MonitorOrder;
  slot: SlotPos;
  selected: boolean;
  alert: boolean;
  /** Entrega en el rango horario actual (y todavía no salió). */
  hot: boolean;
  tv: boolean;
  dimmed: boolean;
  entering?: boolean;
  enterDelay?: number;
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
  const done = zone === "delivered";
  const common = {
    "data-selected": selected,
    "data-alert": alert,
    "data-hot": hot && !done,
    "data-done": done,
  };
  const enterStyle = entering ? { animation: `ops-in 420ms ease ${enterDelay}ms both` } : undefined;

  if (slot.overflow) {
    const label = `+${slot.extra ?? ""} más`;
    if (slot.kind === "shelf") {
      return (
        <button
          type="button"
          onClick={() => onSelect("__overflow_" + slot.zone)}
          className="shelf-tag shelf-tag--more absolute"
          style={{ left: slot.x, top: slot.y, width: FRIDGE.w - 20 }}
        >
          {label} en esta heladera
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onSelect("__overflow_" + slot.zone)}
        className="glass absolute rounded-full px-3 py-1.5 text-[12px] font-bold text-[#c45b72]"
        style={{ left: slot.x, top: slot.y + 30, transform: `scale(${labelScale})`, transformOrigin: "0 0" }}
      >
        {label} pedidos
      </button>
    );
  }

  if (slot.kind === "shelf") {
    return (
      <button
        type="button"
        {...common}
        onClick={() => onSelect(order.id)}
        title={`${order.code} · ${full} · ${order.unitsOrdered} potes`}
        className={`tammy-ops-chip shelf-tag absolute text-left ${dimmed ? "opacity-25" : "opacity-100"}`}
        style={{ left: slot.x, top: slot.y, width: FRIDGE.w - 20, zIndex: selected ? 900 : Math.round(slot.y / 4), ["--accent" as string]: accent, ...enterStyle }}
      >
        <span className="shelf-tag__shelf" title="Estante">{slot.shelf}</span>
        <span className="shelf-tag__plate">{order.code}</span>
        <span className="shelf-tag__name">{name}</span>
        <span className="shelf-tag__units">{order.unitsOrdered}u</span>
      </button>
    );
  }

  const h = crateHeight(order.unitsOrdered);
  return (
    <button
      type="button"
      {...common}
      onClick={() => onSelect(order.id)}
      className={`tammy-ops-chip absolute text-left ${dimmed ? "opacity-25" : ""}`}
      style={{ left: slot.x, top: slot.y - (h - 86), width: CRATE_W, zIndex: selected ? 900 : Math.round(slot.y / 4), ["--accent" as string]: accent, ...enterStyle }}
    >
      <span className="tammy-ops-crate block">
        <IsoCrate fill={crate.fill} side={crate.side} units={order.unitsOrdered} />
      </span>
      {(showLabel || selected) && (
        <span
          className="slot-tag absolute left-1/2 top-0"
          style={{
            transformOrigin: "50% 100%",
            transform: `translate(-50%, calc(-100% - ${slot.stagger ? 46 : 4}px)) scale(${labelScale})`,
          }}
        >
          <span className="slot-tag__dot" />
          <span className="slot-tag__plate">{order.code}</span>
          <span className="slot-tag__meta">{name}</span>
          <span className="slot-tag__units">{order.unitsOrdered}u</span>
        </span>
      )}
      {done && (
        <span className="absolute -right-1 top-3 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow">✓</span>
      )}
    </button>
  );
}
