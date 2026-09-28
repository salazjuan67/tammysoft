import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
      for (const item of solicitud.items) {
        const factura = item.pedido.factura;

        if (factura && Number(item.porcentajeFacturado) > 0) {
          // Actualizar la factura existente con el monto facturado + IVA
          await tx.factura.update({
            where: { id: factura.id },
            data: {
              montoNeto: Number(item.montoBase),
              montoIva: Number(item.montoIva),
              montoTotal: Number(item.montoTransfer),
              tasaIva: Number(solicitud.tasaIva),
            },
          });
        }

        // Registrar el pago en efectivo si hay monto
        if (Number(item.montoEfectivo) > 0) {
          await tx.pago.create({
            data: {
              clienteId: solicitud.clienteId,
              facturaId: factura?.id ?? null,
              monto: Number(item.montoEfectivo),
              tipoPago: "EFECTIVO",
              usuarioId: session.user.id,
              observaciones: `Efectivo sin facturar (solicitud #${solicitud.numero})`,
            },
          });
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
