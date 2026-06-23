import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  const clienteId = (session?.user as { clienteId?: string })?.clienteId;
  if (!clienteId) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");

  const estadoMap: Record<string, string[]> = {
    cobrada: ["COBRADA"],
    "sin-cobrar": ["PENDIENTE", "PARCIALMENTE_COBRADA"],
    anulada: ["ANULADA"],
  };

  const facturas = await db.factura.findMany({
    where: {
      clienteId,
      ...(estado && estadoMap[estado] ? { estado: { in: estadoMap[estado] as never[] } } : {}),
    },
    include: {
      pedido: {
        select: {
          fechaEntrega: true,
          items: { include: { producto: { select: { nombre: true } } } },
        },
      },
      pagos: { select: { monto: true, tipoPago: true, fechaPago: true } },
    },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json({ data: JSON.parse(JSON.stringify(facturas)) });
}
