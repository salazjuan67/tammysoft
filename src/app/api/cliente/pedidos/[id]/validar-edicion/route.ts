import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validarEdicionPedido } from "@/lib/validarEdicion";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const clienteId = (session?.user as { clienteId?: string })?.clienteId;
  if (!clienteId) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const { id } = await params;
  const pedido = await db.pedido.findFirst({
    where: { id, clienteId },
    select: { id: true, estado: true, fechaEntrega: true, createdAt: true },
  });

  if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const validacion = validarEdicionPedido(pedido);
  return NextResponse.json(JSON.parse(JSON.stringify(validacion)));
}
