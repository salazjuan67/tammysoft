export type MonitorStatus =
  | "pending"
  | "production"
  | "stored"
  | "ready_dispatch"
  | "delivered"
  | "cancelled"
  | "unknown";

export type MonitorFilter =
  | "all"
  | "pending"
  | "production"
  | "stored"
  | "ready_dispatch"
  | "delivered"
  | "alerts";

export type MonitorOrderItem = {
  id?: string;
  name: string;
  units: number;
  category?: string;
};

export type MonitorPlacement = {
  fridgeId: string;
  shelfId?: string;
  units?: number;
};

export type MonitorTimelineEvent = {
  at: string;
  label: string;
  source: "createdAt" | "fechaProduccion" | "updatedAt";
};

export type MonitorOrder = {
  id: string;
  code: string;
  customerName: string;
  endCustomerName?: string;
  status: MonitorStatus;
  rawEstado: string;
  rangoHorario: string;
  deliveryAt?: string;
  createdAt?: string;
  productionStartedAt?: string;
  deliveredAt?: string;
  unitsOrdered: number;
  items: MonitorOrderItem[];
  placements: MonitorPlacement[];
  notes?: string;
  updatedAt?: string;
  timeline: MonitorTimelineEvent[];
};

export type MonitorLocation = {
  id: string;
  name: string;
  shelves: Array<{ id: string; label: string }>;
};

export type MonitorAlertKind =
  | "delivery_soon"
  | "delivery_overdue"
  | "production_delayed"
  | "missing_location";

export type MonitorAlert = {
  id: string;
  kind: MonitorAlertKind;
  severity: "warning" | "critical";
  orderId: string;
  title: string;
  detail: string;
};

export type MonitorKpis = {
  pending: { orders: number; units: number };
  production: { orders: number; units: number };
  stored: { orders: number; units: number };
  ready_dispatch: { orders: number; units: number };
  delivered: { orders: number; units: number };
  alerts: number;
};

export type MonitorSnapshot = {
  fecha: string;
  orders: MonitorOrder[];
  locations: MonitorLocation[];
  kpis: MonitorKpis;
  alerts: MonitorAlert[];
  dispatchHeuristic: string;
  timezone: string;
  serverTime: string;
  updatedAt: string;
  demo?: boolean;
};

export const MONITOR_TZ = "America/Argentina/Buenos_Aires";
export const ALERT_SOON_MINUTES = 30;
export const PRODUCTION_DELAY_HOURS = 3;
export const MONITOR_MAX_ORDERS = 300;
export const ZONE_VISIBLE_CAP = 10;

export const RANGO_END_HOUR: Record<string, number> = {
  H5_6: 6,
  H7_8: 8,
  H9_10: 10,
  H10_12: 12,
  H12_14: 14,
  H14_16: 16,
  H16_18: 18,
};

export const RANGO_ORDER = ["H5_6", "H7_8", "H9_10", "H10_12", "H12_14", "H14_16", "H16_18", "SIN_ESPECIFICAR"];
