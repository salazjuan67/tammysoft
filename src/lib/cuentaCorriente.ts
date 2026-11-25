import type { db } from "@/lib/db";

type Monto = number | string | { toString(): string };

export type EstadoCobro = "PENDIENTE" | "PARCIALMENTE_COBRADA" | "COBRADA";

// Diferencias menores a medio centavo se consideran saldadas.
export const TOLERANCIA = 0.005;

export const FACTURA_VIGENTE = { estado: { not: "ANULADA" as const } };

export type FacturaArcaCampos = {
  montoTotal: Monto;
  porcentajeArca?: Monto | null;
  tasaIvaArca?: Monto | null;
  facturadoArca?: boolean | null;
};

export function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Importe a facturar en ARCA (IVA incluido) y su desglose en neto e IVA. */
export function importeArca(montoTotal: Monto, porcentaje: Monto, tasaIva: Monto) {
  const total = redondear(Number(montoTotal) * Number(porcentaje));
  const neto = redondear(total / (1 + Number(tasaIva)));
  return { total, neto, iva: redondear(total - neto) };
}

/**
 * IVA de la parte facturada en ARCA que se suma a la deuda del cliente.
 * Solo aplica cuando la factura ya está marcada como facturada en ARCA.
 */
export function ivaArcaAdicional(f: FacturaArcaCampos): number {
  if (!f.facturadoArca) return 0;
  const pct = Number(f.porcentajeArca ?? 0);
  if (pct <= 0) return 0;
  return importeArca(f.montoTotal, pct, f.tasaIvaArca ?? 0.21).iva;
}

/** Total bruto a cobrar = monto comercial + IVA ARCA (si está facturada). */
export function montoACobrarBruto(f: FacturaArcaCampos): number {
  return redondear(Number(f.montoTotal) + ivaArcaAdicional(f));
}

export function totalNotasCredito(notas: { monto: Monto }[] | undefined | null): number {
  if (!notas?.length) return 0;
  return redondear(notas.reduce((s, n) => s + Number(n.monto), 0));
}

/**
 * Monto vigente a cobrar después de notas de crédito.
 * Las NC no pueden dejar el monto por debajo de 0.
 */
export function montoACobrar(
  f: FacturaArcaCampos & { notasCredito?: { monto: Monto }[] | null }
): number {
  return redondear(Math.max(0, montoACobrarBruto(f) - totalNotasCredito(f.notasCredito)));
}

export function saldoFactura(montoACobrarTotal: Monto, pagos: { monto: Monto }[]) {
  const totalPagado = redondear(pagos.reduce((s, p) => s + Number(p.monto), 0));
  const saldo = redondear(Math.max(0, Number(montoACobrarTotal) - totalPagado));
  return { totalPagado, saldo };
}

export function estadoSegunSaldo(montoACobrarTotal: Monto, totalPagado: number): EstadoCobro {
  if (Number(montoACobrarTotal) <= TOLERANCIA) return "COBRADA";
  if (totalPagado > 0 && totalPagado >= Number(montoACobrarTotal) - TOLERANCIA) return "COBRADA";
  if (totalPagado > 0) return "PARCIALMENTE_COBRADA";
  return "PENDIENTE";
}

export async function recalcularEstadoFactura(tx: { factura: typeof db.factura }, facturaId: string) {
  const factura = await tx.factura.findUnique({
    where: { id: facturaId },
    include: {
      pagos: { select: { monto: true } },
      notasCredito: { select: { monto: true } },
    },
  });
  if (!factura) return null;
  if (factura.estado === "ANULADA") return "ANULADA";

  const bruto = montoACobrarBruto(factura);
  const creditos = totalNotasCredito(factura.notasCredito);

  // NC por el total (o más) → anular
  if (creditos >= bruto - TOLERANCIA && bruto > 0) {
    await tx.factura.update({ where: { id: facturaId }, data: { estado: "ANULADA" } });
    return "ANULADA";
  }

  const aCobrar = redondear(Math.max(0, bruto - creditos));
  const { totalPagado } = saldoFactura(aCobrar, factura.pagos);
  const estado = estadoSegunSaldo(aCobrar, totalPagado);
  if (estado !== factura.estado) {
    await tx.factura.update({ where: { id: facturaId }, data: { estado } });
  }
  return estado;
}

/** Suma los saldos de facturas vigentes y devuelve solo las que deben algo. */
export function facturasConSaldo<
  T extends FacturaArcaCampos & {
    pagos: { monto: Monto }[];
    notasCredito?: { monto: Monto }[] | null;
  },
>(facturas: T[]) {
  return facturas
    .map((f) => {
      const aCobrar = montoACobrar(f);
      const ivaArca = ivaArcaAdicional(f);
      const creditos = totalNotasCredito(f.notasCredito);
      const { totalPagado, saldo } = saldoFactura(aCobrar, f.pagos);
      return { factura: f, totalPagado, saldo, montoACobrar: aCobrar, ivaArca, totalCreditos: creditos };
    })
    .filter((f) => f.saldo > TOLERANCIA);
}
