import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") ?? "PENDIENTE";

  const solicitudes = await db.solicitudFacturacion.findMany({
    where: estado !== "todas" ? { estado: estado as "PENDIENTE" | "PROCESADA" | "RECHAZADA" } : {},
    include: {
      cliente: { select: { id: true, nombre: true } },
      items: {
        include: {
          pedido: { select: { id: true, fechaEntrega: true, notas: true, montoTotal: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    data: solicitudes.map((s) => ({
      ...s,
      montoEfectivo: Number(s.montoEfectivo),
      montoBase: Number(s.montoBase),
      montoIva: Number(s.montoIva),
      montoTransfer: Number(s.montoTransfer),
      montoTotal: Number(s.montoTotal),
      tasaIva: Number(s.tasaIva),
      items: s.items.map((i) => ({
        ...i,
        pedidoMontoTotal: Number(i.pedidoMontoTotal),
        porcentajeFacturado: Number(i.porcentajeFacturado),
        montoEfectivo: Number(i.montoEfectivo),
        montoBase: Number(i.montoBase),
        montoIva: Number(i.montoIva),
        montoTransfer: Number(i.montoTransfer),
        pedido: { ...i.pedido, montoTotal: Number(i.pedido.montoTotal) },
      })),
    })),
  });
}
