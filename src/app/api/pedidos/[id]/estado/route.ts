import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
const estadoSchema = z.object({
  estado: z.enum(["PENDIENTE", "EN_PRODUCCION", "ENTREGADO", "CANCELADO"]),
  // IVA rate for invoice generation (only used when estado = ENTREGADO)
  tasaIva: z.number().min(0).max(1).optional().default(0),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = estadoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { estado, tasaIva } = parsed.data;

  const pedido = await db.pedido.findUnique({
    where: { id },
    include: { factura: true, cliente: true },
  });

  if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const result = await db.$transaction(async (tx) => {
    const pedidoActualizado = await tx.pedido.update({
      where: { id },
      data: { estado },
    });

    // Generar factura automáticamente al marcar como ENTREGADO
    if (estado === "ENTREGADO" && !pedido.factura) {
      const total = Number(pedido.montoTotal);
      const ivaRate = tasaIva ?? 0;
      const montoNeto = ivaRate > 0 ? total / (1 + ivaRate) : total;
      const montoIva = total - montoNeto;
      await tx.factura.create({
        data: {
          pedidoId: id,
          clienteId: pedido.clienteId,
          montoNeto,
          montoIva,
          montoTotal: total,
          tasaIva: ivaRate,
        },
      });
    }

    return pedidoActualizado;
  });

  return NextResponse.json({ data: result });
}
