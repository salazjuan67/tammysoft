import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildSnapshot } from "@/lib/monitor/buildSnapshot";
import { MONITOR_MAX_ORDERS, MONITOR_TZ } from "@/lib/monitor/types";
import { fechaKey as fechaHoy } from "@/lib/monitor/time";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(rol)) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const fecha = req.nextUrl.searchParams.get("fecha") || fechaHoy();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const inicio = new Date(`${fecha}T00:00:00`);
  const fin = new Date(`${fecha}T23:59:59.999`);

  const pedidos = await db.pedido.findMany({
    where: {
      fechaEntrega: { gte: inicio, lte: fin },
      estado: { not: "CANCELADO" },
    },
    include: {
      cliente: { select: { nombre: true } },
      items: {
        include: { producto: { include: { categoria: { select: { nombre: true } } } } },
        orderBy: { producto: { nombre: "asc" } },
      },
    },
    orderBy: [{ rangoHorario: "asc" }, { createdAt: "asc" }],
    take: MONITOR_MAX_ORDERS,
  });

  const snapshot = buildSnapshot(
    JSON.parse(JSON.stringify(pedidos)),
    fecha,
    new Date()
  );

  return NextResponse.json({ data: { ...snapshot, timezone: MONITOR_TZ } });
}

export const dynamic = "force-dynamic";
