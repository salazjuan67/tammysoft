import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const itemSchema = z.object({
  pedidoId: z.string(),
  pedidoMontoTotal: z.number().positive(),
  pedidoNotas: z.string().optional(),
  porcentajeFacturado: z.number().min(0).max(1),
});

const solicitudSchema = z.object({
  tasaIva: z.number().min(0).max(1).default(0.21),
  notas: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (userRol !== "CLIENTE") return NextResponse.json({ error: "Solo distribuidores" }, { status: 403 });

  const cliente = await db.cliente.findFirst({
    where: { usuario: { id: session.user.id } },
  });
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = solicitudSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { tasaIva, notas, items } = parsed.data;

  const pedidoIds = [...new Set(items.map((i) => i.pedidoId))];
  if (pedidoIds.length !== items.length) {
    return NextResponse.json({ error: "Hay pedidos repetidos en la solicitud" }, { status: 400 });
  }

  const pedidos = await db.pedido.findMany({
    where: { id: { in: pedidoIds }, clienteId: cliente.id, estado: "ENTREGADO" },
    select: { id: true, montoTotal: true, notas: true },
  });
  if (pedidos.length !== pedidoIds.length) {
    return NextResponse.json({ error: "Algún pedido no existe, no es tuyo o todavía no fue entregado" }, { status: 400 });
  }

  const yaSolicitados = await db.solicitudItem.count({
    where: { pedidoId: { in: pedidoIds }, solicitud: { estado: { not: "RECHAZADA" } } },
  });
  if (yaSolicitados > 0) {
    return NextResponse.json({ error: "Algún pedido ya está incluido en otra solicitud" }, { status: 409 });
  }

  const pedidosMap = new Map(pedidos.map((p) => [p.id, p]));

  // Calcular totales
  let totalEfectivo = 0;
  let totalBase = 0;
  let totalIva = 0;
  let totalTransfer = 0;

  const itemsCalculados = items.map((item) => {
    const pedido = pedidosMap.get(item.pedidoId)!;
    const pedidoMontoTotal = Number(pedido.montoTotal);
    const montoEfectivo = pedidoMontoTotal * (1 - item.porcentajeFacturado);
    const montoBase = pedidoMontoTotal * item.porcentajeFacturado;
    const montoIva = montoBase * tasaIva;
    const montoTransfer = montoBase + montoIva;

    totalEfectivo += montoEfectivo;
    totalBase += montoBase;
    totalIva += montoIva;
    totalTransfer += montoTransfer;

    return {
      pedidoId: item.pedidoId,
      pedidoMontoTotal,
      pedidoNotas: pedido.notas ?? item.pedidoNotas ?? null,
      porcentajeFacturado: item.porcentajeFacturado,
      montoEfectivo,
      montoBase,
      montoIva,
      montoTransfer,
    };
  });

  const solicitud = await db.solicitudFacturacion.create({
    data: {
      clienteId: cliente.id,
      tasaIva,
      notas,
      montoEfectivo: totalEfectivo,
      montoBase: totalBase,
      montoIva: totalIva,
      montoTransfer: totalTransfer,
      montoTotal: totalEfectivo + totalTransfer,
      items: { create: itemsCalculados },
    },
    include: { items: true },
  });

  return NextResponse.json({ data: solicitud }, { status: 201 });
}
