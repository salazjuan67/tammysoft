"use client";

import { useCallback, useSyncExternalStore } from "react";
import { fechaKey } from "@/lib/monitor/time";

const PREF_EVENT = "tammy-ops-pref";

function subscribePrefs(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(PREF_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(PREF_EVENT, cb);
  };
}

/** Preferencia on/off guardada en localStorage; en el servidor y al hidratar vale `fallback`. */
export function useStoredFlag(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    subscribePrefs,
    () => {
      const v = localStorage.getItem(key);
      return v == null ? fallback : v === "on";
    },
    () => fallback,
  );
  const set = useCallback(
    (next: boolean) => {
      localStorage.setItem(key, next ? "on" : "off");
      window.dispatchEvent(new Event(PREF_EVENT));
    },
    [key],
  );
  return [value, set];
}

export function useMediaQuery(query: string, fallback = false) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

function subscribeMinute(cb: () => void) {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
}

/** Fecha de hoy (YYYY-MM-DD en hora de Argentina); cambia sola a medianoche. Vacía hasta hidratar. */
export function useToday() {
  return useSyncExternalStore(subscribeMinute, () => fechaKey(), () => "");
}
