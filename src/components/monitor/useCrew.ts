"use client";

import { useEffect, useRef, useState } from "react";
import type { CrewGroupWithStations as CrewGroup } from "./KitchenBackdrop";

const MOVE_MIN_MS = 7000;
const MOVE_MAX_MS = 16000;
export const WALK_MS = 2600;

/** Estación ocupada por cada persona del grupo; completa con las primeras libres si cambió la cantidad. */
function resolveSeats(group: CrewGroup, stored: number[] | undefined) {
  const n = Math.min(group.count, group.stations.length);
  const seats: number[] = [];
  for (const s of stored ?? []) {
    if (seats.length >= n) break;
    if (s < group.stations.length && !seats.includes(s)) seats.push(s);
  }
  const len = group.stations.length;
  for (let k = 0; seats.length < n && k < n; k++) {
    const s = Math.floor(((k + 0.5) * len) / n);
    if (!seats.includes(s)) seats.push(s);
  }
  for (let s = 0; seats.length < n; s++) if (!seats.includes(s)) seats.push(s);
  return seats;
}

/**
 * Cada tanto una persona al azar camina a una estación libre de su mismo ambiente.
 * Quieto en modo calma o con "reducir movimiento" del sistema.
 */
export function useCrew(groups: CrewGroup[], enabled: boolean) {
  const [stored, setStored] = useState<Record<string, number[]>>({});
  const [walking, setWalking] = useState<string | null>(null);
  const latest = useRef({ groups, stored });
  useEffect(() => {
    latest.current = { groups, stored };
  });

  useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let moveTimer: ReturnType<typeof setTimeout>;
    let walkTimer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      moveTimer = setTimeout(() => {
        const { groups: gs, stored: st } = latest.current;
        const movable = gs.filter((g) => g.count > 0 && g.count < g.stations.length);
        if (movable.length) {
          const g = movable[Math.floor(Math.random() * movable.length)];
          const seats = resolveSeats(g, st[g.key]);
          const free = g.stations.map((_, i) => i).filter((i) => !seats.includes(i));
          const who = Math.floor(Math.random() * seats.length);
          seats[who] = free[Math.floor(Math.random() * free.length)];
          setStored((prev) => ({ ...prev, [g.key]: seats }));
          setWalking(`${g.key}-${who}`);
          clearTimeout(walkTimer);
          walkTimer = setTimeout(() => setWalking(null), WALK_MS);
        }
        schedule();
      }, MOVE_MIN_MS + Math.random() * (MOVE_MAX_MS - MOVE_MIN_MS));
    };
    schedule();
    return () => {
      clearTimeout(moveTimer);
      clearTimeout(walkTimer);
    };
  }, [enabled]);

  return groups.flatMap((g) =>
    resolveSeats(g, stored[g.key]).map((seat, i) => ({
      id: `${g.key}-${i}`,
      ...g.stations[seat],
      accent: g.accent,
      courier: g.courier,
      walking: walking === `${g.key}-${i}`,
    })),
  );
}
