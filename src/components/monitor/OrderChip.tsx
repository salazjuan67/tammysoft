"use client";

import type { MonitorOrder } from "@/lib/monitor/types";
import { sceneStatus } from "@/lib/monitor/selectors";
import type { SlotPos } from "@/lib/monitor/layout";
import { WORLD } from "@/lib/monitor/layout";
import { IsoCrate } from "./Iso";

const CRATE: Record<string, { fill: string; side: string; tag: string }> = {
  pending: { fill: "#f4c4b0", side: "#d4927c", tag: "bg-rose-100 text-rose-800" },
  production: { fill: "#f3d7a4", side: "#d4ae62", tag: "bg-amber-100 text-amber-900" },
  stored: { fill: "#cfe8f2", side: "#86b7c8", tag: "bg-sky-100 text-sky-900" },
  ready_dispatch: { fill: "#ddd0f2", side: "#a48bc8", tag: "bg-violet-100 text-violet-900" },
  delivered: { fill: "#c8e8d4", side: "#7db894", tag: "bg-emerald-100 text-emerald-900" },
};

export function OrderChip({
  order,
  slot,
  selected,
  alert,
  tv,
  dimmed,
  entering,
  onSelect,
}: {
  order: MonitorOrder;
  slot: SlotPos;
  selected: boolean;
  alert: boolean;
  tv: boolean;
  dimmed: boolean;
  entering?: boolean;
  onSelect: (id: string) => void;
}) {
  const zone = slot.zone === "ready_dispatch" ? "ready_dispatch" : sceneStatus(order);
  const crate = CRATE[zone] ?? CRATE.pending;
  const name = tv
    ? (order.endCustomerName ?? order.customerName).split(" ")[0]
    : (order.endCustomerName ?? order.customerName);
  if (slot.overflow) {
    return (
      <button
        type="button"
        onClick={() => onSelect("__overflow_" + slot.zone)}
        className="absolute rounded-full bg-white/90 px-2 py-1 text-[11px] font-bold text-rose-700 shadow"
        style={{ left: `${(slot.x / WORLD.width) * 100}%`, top: `${(slot.y / WORLD.height) * 100}%` }}
      >
        + más
      </button>
    );
  }
  return (
    <button
      type="button"
      data-selected={selected}
      data-alert={alert}
      onClick={() => onSelect(order.id)}
      className={`tammy-ops-chip absolute w-[86px] text-left ${dimmed ? "opacity-30" : "opacity-100"} ${entering ? "animate-[ops-in_350ms_ease]" : ""}`}
      style={{ left: `${(slot.x / WORLD.width) * 100}%`, top: `${(slot.y / WORLD.height) * 100}%`, zIndex: selected ? 20 : 5 }}
    >
      <IsoCrate fill={crate.fill} side={crate.side} />
      <span className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow ${crate.tag} ${tv ? "text-[12px]" : ""}`}>
        {order.code} · {name}
      </span>
      {zone === "delivered" && (
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-[9px] text-white">✓</span>
      )}
    </button>
  );
}
