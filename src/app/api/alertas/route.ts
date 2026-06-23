import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const soloNoLeidas = searchParams.get("noLeidas") !== "false";

  const alertas = await db.alerta.findMany({
    where: { ...(soloNoLeidas && { leido: false }) },
    include: {
      pedido: {
        include: { cliente: { select: { nombre: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: alertas });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { ids, marcarTodas } = body;

  if (marcarTodas) {
    await db.alerta.updateMany({
      where: { leido: false },
      data: { leido: true, leidoAt: new Date() },
    });
    return NextResponse.json({ message: "Todas las alertas marcadas como leídas" });
  }

  if (ids && Array.isArray(ids)) {
    await db.alerta.updateMany({
      where: { id: { in: ids } },
      data: { leido: true, leidoAt: new Date() },
    });
    return NextResponse.json({ message: `${ids.length} alertas marcadas como leídas` });
  }

  return NextResponse.json({ error: "Debe proveer ids o marcarTodas" }, { status: 400 });
}
