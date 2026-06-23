import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const pagarSchema = z.object({
  monto: z.number().positive(),
  tipoPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "CHEQUE"]),
  referencia: z.string().optional().nullable(),
  fechaPago: z.string().optional(),
  observaciones: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(rol))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = pagarSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { monto, tipoPago, referencia, fechaPago, observaciones } = parsed.data;

  const result = await db.$transaction(async (tx) => {
    const factura = await tx.facturaProveedor.findUnique({
      where: { id },
      include: { pagos: { select: { monto: true } } },
    });

    if (!factura) throw new Error("Factura no encontrada");
    if (factura.estado === "PAGADA") throw new Error("La factura ya está pagada.");

    const totalPagadoAntes = factura.pagos.reduce((s, p) => s + Number(p.monto), 0);
    const saldo = Number(factura.montoTotal) - totalPagadoAntes;
    if (monto > saldo + 0.01) throw new Error(`El monto excede el saldo pendiente (${saldo.toFixed(2)}).`);

    const pago = await tx.pagoProveedor.create({
      data: {
        proveedorId: factura.proveedorId,
        facturaProveedorId: id,
        monto,
        tipoPago,
        referencia: referencia ?? null,
        fechaPago: fechaPago ? new Date(fechaPago + "T00:00:00") : new Date(),
        observaciones: observaciones ?? null,
        usuarioId: session!.user!.id,
      },
    });

    const totalPagado = totalPagadoAntes + monto;
    let nuevoEstado: "PENDIENTE" | "PARCIALMENTE_PAGADA" | "PAGADA" = "PENDIENTE";
    if (totalPagado >= Number(factura.montoTotal) - 0.01) nuevoEstado = "PAGADA";
    else if (totalPagado > 0) nuevoEstado = "PARCIALMENTE_PAGADA";

    const facturaActualizada = await tx.facturaProveedor.update({
      where: { id },
      data: { estado: nuevoEstado },
    });

    return { pago, nuevoEstado, saldoPendiente: Math.max(0, Number(factura.montoTotal) - totalPagado), facturaActualizada };
  });

  return NextResponse.json({ data: { ...result, pago: { ...result.pago, monto: Number(result.pago.monto) } } }, { status: 201 });
}
