/**
 * Aviso en memoria de "cambiaron pedidos", para el monitor en tiempo real (SSE).
 * Vale porque la app corre en un solo proceso (PM2 fork); con varios procesos haría falta LISTEN/NOTIFY.
 * Vive en globalThis para que lo compartan todos los bundles de rutas del mismo proceso.
 */
type Listener = () => void;

type Bus = { version: number; listeners: Set<Listener>; timer: ReturnType<typeof setTimeout> | null };

const g = globalThis as unknown as { __tammyMonitorBus?: Bus };
const bus: Bus = (g.__tammyMonitorBus ??= { version: 0, listeners: new Set(), timer: null });

/** Agrupa ráfagas (transacciones, cambios masivos) en un solo aviso. */
const DEBOUNCE_MS = 400;

export function notifyPedidosChanged() {
  if (bus.timer) clearTimeout(bus.timer);
  bus.timer = setTimeout(() => {
    bus.timer = null;
    bus.version += 1;
    for (const listener of bus.listeners) listener();
  }, DEBOUNCE_MS);
}

export function onPedidosChanged(listener: Listener) {
  bus.listeners.add(listener);
  return () => {
    bus.listeners.delete(listener);
  };
}

export function pedidosVersion() {
  return bus.version;
}
