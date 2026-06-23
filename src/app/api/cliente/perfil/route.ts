import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const clienteId = (session?.user as { clienteId?: string })?.clienteId;
  if (!clienteId) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const cliente = await db.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, nombre: true, email: true, telefono: true, direccion: true },
  });

  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  return NextResponse.json({ data: cliente });
}
