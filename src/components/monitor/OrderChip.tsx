"use client";

import type { MonitorOrder } from "@/lib/monitor/types";
import { sceneStatus } from "@/lib/monitor/selectors";
import type { SlotPos } from "@/lib/monitor/layout";
import { WORLD } from "@/lib/monitor/layout";

const TINT: Record<string, string> = {
  pending: "bg-[#f8d5d8] border-[#e8919c]",
  production: "bg-[#f6e0b8] border-[#e0b45a]",
  stored: "bg-[#d5eef4] border-[#7eb9c8]",
  ready_dispatch: "bg-[#e4d7f6] border-[#a888d4]",
  delivered: "bg-[#d4eedd] border-[#7cbc93]",
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
  const name = tv
    ? (order.endCustomerName ?? order.customerName).split(" ")[0]
    : (order.endCustomerName ?? order.customerName);
  if (slot.overflow) {
    return (
      <button
        type="button"
        onClick={() => onSelect("__overflow_" + slot.zone)}
        className="absolute rounded-xl border border-dashed border-rose-300 bg-white/80 px-2 py-1 text-[11px] font-semibold text-rose-700"
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
      className={`tammy-ops-chip absolute w-[108px] rounded-xl border px-2 py-1.5 text-left shadow-md ${TINT[zone] ?? TINT.pending} ${dimmed ? "opacity-35" : "opacity-100"} ${tv ? "w-[128px] py-2" : ""} ${entering ? "animate-[ops-in_350ms_ease]" : ""}`}
      style={{ left: `${(slot.x / WORLD.width) * 100}%`, top: `${(slot.y / WORLD.height) * 100}%` }}
    >
      <span className="block font-bold leading-none text-[#4a342c]">{order.code}</span>
      <span className="mt-0.5 block truncate text-[11px] text-[#6b4b44]">{name}</span>
      <span className="block text-[10px] font-semibold text-[#8b5e4a]">{order.unitsOrdered} u.</span>
    </button>
  );
}
