import type { db } from "@/lib/db";

type Monto = number | string | { toString(): string };

export type EstadoCobro = "PENDIENTE" | "PARCIALMENTE_COBRADA" | "COBRADA";

// Diferencias menores a medio centavo se consideran saldadas.
export const TOLERANCIA = 0.005;

export const FACTURA_VIGENTE = { estado: { not: "ANULADA" as const } };

export function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

export function saldoFactura(montoTotal: Monto, pagos: { monto: Monto }[]) {
  const totalPagado = redondear(pagos.reduce((s, p) => s + Number(p.monto), 0));
  const saldo = redondear(Math.max(0, Number(montoTotal) - totalPagado));
  return { totalPagado, saldo };
}

export function estadoSegunSaldo(montoTotal: Monto, totalPagado: number): EstadoCobro {
  if (totalPagado > 0 && totalPagado >= Number(montoTotal) - TOLERANCIA) return "COBRADA";
  if (totalPagado > 0) return "PARCIALMENTE_COBRADA";
  return "PENDIENTE";
}

export async function recalcularEstadoFactura(tx: { factura: typeof db.factura }, facturaId: string) {
  const factura = await tx.factura.findUnique({
    where: { id: facturaId },
    include: { pagos: { select: { monto: true } } },
  });
  if (!factura || factura.estado === "ANULADA") return factura?.estado ?? null;

  const { totalPagado } = saldoFactura(factura.montoTotal, factura.pagos);
  const estado = estadoSegunSaldo(factura.montoTotal, totalPagado);
  if (estado !== factura.estado) {
    await tx.factura.update({ where: { id: facturaId }, data: { estado } });
  }
  return estado;
}

/** Importe a facturar en ARCA (IVA incluido) y su desglose en neto e IVA. */
export function importeArca(montoTotal: Monto, porcentaje: Monto, tasaIva: Monto) {
  const total = redondear(Number(montoTotal) * Number(porcentaje));
  const neto = redondear(total / (1 + Number(tasaIva)));
  return { total, neto, iva: redondear(total - neto) };
}

/** Suma los saldos de facturas (ya filtradas como vigentes) y devuelve solo las que deben algo. */
export function facturasConSaldo<T extends { montoTotal: Monto; pagos: { monto: Monto }[] }>(facturas: T[]) {
  return facturas
    .map((f) => ({ factura: f, ...saldoFactura(f.montoTotal, f.pagos) }))
    .filter((f) => f.saldo > TOLERANCIA);
}
