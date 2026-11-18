import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { importeArca, recalcularEstadoFactura, saldoFactura } from "@/lib/cuentaCorriente";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const factura = await db.factura.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, email: true, telefono: true, direccion: true } },
      pedido: {
        include: {
          items: {
            include: { producto: { select: { id: true, nombre: true } } },
          },
        },
      },
      pagos: {
        select: { id: true, monto: true, tipoPago: true, fechaPago: true, observaciones: true },
        orderBy: { fechaPago: "asc" },
      },
    },
  });

  if (!factura) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });

  const { totalPagado, saldo } = saldoFactura(factura.montoTotal, factura.pagos);

  return NextResponse.json({
    data: {
      ...factura,
      pagos: factura.pagos.map((p) => ({ ...p, monto: Number(p.monto) })),
      totalPagado,
      saldoPendiente: factura.estado === "ANULADA" ? 0 : saldo,
      porcentajeArca: Number(factura.porcentajeArca),
      tasaIvaArca: Number(factura.tasaIvaArca),
      arca: importeArca(factura.montoTotal, factura.porcentajeArca, factura.tasaIvaArca),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { tasaIva } = body;

  if (tasaIva === undefined || typeof tasaIva !== "number" || tasaIva < 0 || tasaIva > 1) {
    return NextResponse.json(
      { error: "El estado se calcula a partir de los cobros; solo se puede modificar la tasa de IVA" },
      { status: 400 }
    );
  }

  const facturaActual = await db.factura.findUnique({ where: { id } });
  if (!facturaActual) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  if (facturaActual.estado === "ANULADA") {
    return NextResponse.json({ error: "La factura está anulada" }, { status: 400 });
  }

  // El IVA se aplica sobre el monto neto original
  const montoNeto = Number(facturaActual.montoNeto);
  const montoIva = montoNeto * tasaIva;

  const factura = await db.$transaction(async (tx) => {
    await tx.factura.update({
      where: { id },
      data: { tasaIva, montoIva, montoTotal: montoNeto + montoIva },
    });
    await recalcularEstadoFactura(tx, id);
    return tx.factura.findUnique({ where: { id } });
  });

  return NextResponse.json({ data: factura });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (userRol !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores pueden borrar facturas" }, { status: 403 });
  }

  const { id } = await params;

  // Soft delete: mark as ANULADA
  const factura = await db.factura.update({
    where: { id },
    data: { estado: "ANULADA" },
  });

  return NextResponse.json({ data: factura });
}
