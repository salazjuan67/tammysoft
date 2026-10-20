import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  ids: z.array(z.string()).min(1),
  estado: z.enum(["PENDIENTE", "EN_PRODUCCION", "ENTREGADO", "CANCELADO"]),
  tasaIva: z.number().min(0).max(1).optional().default(0),
  fechaProduccion: z.string().optional(),
  numeroHeladera: z.string().optional(),
  estante: z.string().optional(),
  horarioEntrega: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { ids, estado, tasaIva, fechaProduccion, numeroHeladera, estante, horarioEntrega } = parsed.data;

  const pedidos = await db.pedido.findMany({
    where: { id: { in: ids } },
    include: { factura: true },
  });

  let actualizados = 0;
  let omitidos = 0;

  await db.$transaction(async (tx) => {
    for (const pedido of pedidos) {
      if (pedido.estado === "CANCELADO") { omitidos += 1; continue; }
      if (estado === "ENTREGADO" && pedido.estado === "ENTREGADO") { omitidos += 1; continue; }

      await tx.pedido.update({
        where: { id: pedido.id },
        data: {
          estado,
          ...(estado === "EN_PRODUCCION" && fechaProduccion
            ? { fechaProduccion: new Date(fechaProduccion + "T00:00:00") }
            : {}),
          ...(estado === "ENTREGADO"
            ? {
                ...(numeroHeladera !== undefined && { numeroHeladera }),
                ...(estante !== undefined && { estante }),
              }
            : {}),
        },
      });

      if (horarioEntrega !== undefined && horarioEntrega && pedido.clienteId) {
        await tx.cliente.update({
          where: { id: pedido.clienteId },
          data: { horarioEntrega },
        });
      }

      if (estado === "ENTREGADO" && !pedido.factura) {
        const total = Number(pedido.montoTotal);
        const ivaRate = tasaIva ?? 0;
        const montoNeto = ivaRate > 0 ? total / (1 + ivaRate) : total;
        const montoIva = total - montoNeto;
        await tx.factura.create({
          data: {
            pedidoId: pedido.id,
            clienteId: pedido.clienteId,
            montoNeto,
            montoIva,
            montoTotal: total,
            tasaIva: ivaRate,
          },
        });
      }

      actualizados += 1;
    }
  });

  return NextResponse.json({
    data: { actualizados, omitidos },
    message: `${actualizados} pedido${actualizados !== 1 ? "s" : ""} actualizado${actualizados !== 1 ? "s" : ""}`,
  });
}
