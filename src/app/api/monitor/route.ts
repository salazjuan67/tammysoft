import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildSnapshot } from "@/lib/monitor/buildSnapshot";
import { pedidosVersion } from "@/lib/monitor/changes";
import type { PedidoFuente } from "@/lib/monitor/adapter";
import { MONITOR_MAX_ORDERS, MONITOR_TZ } from "@/lib/monitor/types";
import { fechaKey as fechaHoy } from "@/lib/monitor/time";

/**
 * Varias pantallas piden el mismo día a la vez: los pedidos se reutilizan mientras no haya cambios
 * (versión del aviso en memoria) y por poco tiempo. El snapshot se arma siempre con la hora actual.
 */
const CACHE_MS = 20_000;
const cache = new Map<string, { version: number; at: number; pedidos: PedidoFuente[] }>();

async function loadPedidos(fecha: string) {
  const version = pedidosVersion();
  const hit = cache.get(fecha);
  if (hit && hit.version === version && Date.now() - hit.at < CACHE_MS) return hit.pedidos;

  const inicio = new Date(`${fecha}T00:00:00`);
  const fin = new Date(`${fecha}T23:59:59.999`);
  const rows = await db.pedido.findMany({
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
  const pedidos = JSON.parse(JSON.stringify(rows)) as PedidoFuente[];
  if (cache.size > 30) cache.clear();
  cache.set(fecha, { version, at: Date.now(), pedidos });
  return pedidos;
}

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

  const snapshot = buildSnapshot(await loadPedidos(fecha), fecha, new Date());

  return NextResponse.json({ data: { ...snapshot, timezone: MONITOR_TZ } });
}

export const dynamic = "force-dynamic";
