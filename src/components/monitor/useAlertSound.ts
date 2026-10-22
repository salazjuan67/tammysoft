"use client";

import { useEffect, useRef } from "react";
import type { MonitorAlert, MonitorAlertKind } from "@/lib/monitor/types";

/** Solo suenan las alertas que piden actuar ya. */
const SOUND_KINDS = new Set<MonitorAlertKind>(["delivery_overdue", "production_delayed"]);

let ctx: AudioContext | null = null;

/** Los navegadores solo dejan sonar audio después de un gesto del usuario: llamar desde un click. */
export async function unlockAlertSound() {
  if (typeof window === "undefined") return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});
}

export function playAlertChime() {
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime;
  [880, 660, 880].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    const start = t0 + i * 0.22;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + 0.22);
  });
}

/**
 * Suena cuando aparece una alerta nueva de entrega vencida o producción demorada.
 * Las que ya estaban al cargar (o al cambiar de día) no suenan.
 */
export function useAlertSound(fecha: string | undefined, alerts: MonitorAlert[] | undefined, enabled: boolean) {
  const seen = useRef<{ fecha: string; ids: Set<string> } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const resume = () => void unlockAlertSound();
    window.addEventListener("pointerdown", resume, { once: true });
    return () => window.removeEventListener("pointerdown", resume);
  }, [enabled]);

  useEffect(() => {
    if (!fecha || !alerts) return;
    const ids = new Set(alerts.filter((a) => SOUND_KINDS.has(a.kind)).map((a) => a.id));
    const prev = seen.current;
    seen.current = { fecha, ids };
    if (!enabled || !prev || prev.fecha !== fecha) return;
    if ([...ids].some((id) => !prev.ids.has(id))) playAlertChime();
  }, [fecha, alerts, enabled]);
}
