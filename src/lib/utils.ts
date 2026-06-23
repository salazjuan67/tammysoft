import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Serializes Prisma results for use in Client Components.
 * Converts Decimal → number, Date → ISO string, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializePrisma<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy", { locale: es });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es });
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

// ─── Validación ventana de edición de pedidos ─────────────────────────────────
// Puede editarse si:
//   1. Ahora < (fechaEntrega - 1 día) a las 12:00 PM, O
//   2. Ahora < (createdAt + 2 horas)
export function puedeEditarPedido(fechaEntrega: Date, createdAt: Date): boolean {
  const ahora = new Date();

  // Opción 1: antes de las 12:00 PM del día anterior a entrega
  const limiteDiaAnterior = new Date(fechaEntrega);
  limiteDiaAnterior.setDate(limiteDiaAnterior.getDate() - 1);
  limiteDiaAnterior.setHours(12, 0, 0, 0);

  // Opción 2: dentro de las 2 horas de creación
  const limite2Horas = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);

  return ahora < limiteDiaAnterior || ahora < limite2Horas;
}

export function tiempoRestanteEdicion(fechaEntrega: Date, createdAt: Date): string | null {
  const ahora = new Date();

  const limiteDiaAnterior = new Date(fechaEntrega);
  limiteDiaAnterior.setDate(limiteDiaAnterior.getDate() - 1);
  limiteDiaAnterior.setHours(12, 0, 0, 0);

  const limite2Horas = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);

  if (ahora < limite2Horas) {
    return `Puede editar por ${formatDistanceToNow(limite2Horas, { locale: es })}`;
  }
  if (ahora < limiteDiaAnterior) {
    return `Puede editar hasta el ${formatDateTime(limiteDiaAnterior)}`;
  }
  return null;
}

// ─── Cálculo de IVA ──────────────────────────────────────────────────────────
export function calcularIVA(
  montoTotal: number,
  tasaIva: number = 0.21
): { montoNeto: number; montoIva: number; montoTotal: number } {
  const montoNeto = montoTotal / (1 + tasaIva);
  const montoIva = montoTotal - montoNeto;
  return {
    montoNeto: Math.round(montoNeto * 100) / 100,
    montoIva: Math.round(montoIva * 100) / 100,
    montoTotal: Math.round(montoTotal * 100) / 100,
  };
}

// ─── Rangos horarios ─────────────────────────────────────────────────────────
export const RANGOS_HORARIO: Record<string, string> = {
  H5_6: "5:00 - 6:00",
  H7_8: "7:00 - 8:00",
  H9_10: "9:00 - 10:00",
  H10_12: "10:00 - 12:00",
  H12_14: "12:00 - 14:00",
  H14_16: "14:00 - 16:00",
  H16_18: "16:00 - 18:00",
  SIN_ESPECIFICAR: "Sin especificar",
};

export function getRangoLabel(rango: string): string {
  return RANGOS_HORARIO[rango] ?? rango;
}

// ─── Etiquetas de estado ─────────────────────────────────────────────────────
export const ESTADO_PEDIDO_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PRODUCCION: "En producción",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const ESTADO_FACTURA_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PARCIALMENTE_COBRADA: "Parcialmente cobrada",
  COBRADA: "Cobrada",
  ANULADA: "Anulada",
};

export const TIPO_PAGO_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};
