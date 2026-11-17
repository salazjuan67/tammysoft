import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recalcularEstadoFactura } from "@/lib/cuentaCorriente";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { accion } = body; // "procesar" | "rechazar"

  const solicitud = await db.solicitudFacturacion.findUnique({
    where: { id },
    include: {
      items: { include: { pedido: { include: { factura: true } } } },
      cliente: true,
    },
  });

  if (!solicitud) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (solicitud.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "La solicitud ya fue procesada" }, { status: 400 });
  }

  if (accion === "rechazar") {
    await db.solicitudFacturacion.update({
      where: { id },
      data: { estado: "RECHAZADA", procesadoEn: new Date() },
    });
    return NextResponse.json({ message: "Solicitud rechazada" });
  }

  if (accion === "procesar") {
    await db.$transaction(async (tx) => {
      // La parte en efectivo sigue adeudada: la factura totaliza efectivo + base + IVA
      // y cada parte se cobra desde Cobranza cuando entra la plata.
      for (const item of solicitud.items) {
        if (Number(item.porcentajeFacturado) <= 0) continue;

        const efectivo = Number(item.montoEfectivo);
        const base = Number(item.montoBase);
        const iva = Number(item.montoIva);
        const data = {
          montoNeto: efectivo + base,
          montoIva: iva,
          montoTotal: efectivo + base + iva,
          tasaIva: Number(solicitud.tasaIva),
        };

        const factura = item.pedido.factura;
        if (factura && factura.estado !== "ANULADA") {
          await tx.factura.update({ where: { id: factura.id }, data });
          await recalcularEstadoFactura(tx, factura.id);
        } else if (!factura) {
          await tx.factura.create({ data: { ...data, pedidoId: item.pedidoId, clienteId: solicitud.clienteId } });
        }
      }

      await tx.solicitudFacturacion.update({
        where: { id },
        data: { estado: "PROCESADA", procesadoEn: new Date() },
      });
    });

    return NextResponse.json({ message: "Solicitud procesada correctamente" });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
