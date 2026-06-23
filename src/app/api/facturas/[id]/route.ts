import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const factura = await db.factura.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, email: true, telefono: true } },
      pedido: {
        include: {
          items: {
            include: { producto: { select: { id: true, nombre: true } } },
          },
        },
      },
    },
  });

  if (!factura) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });

  return NextResponse.json({ data: factura });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { estado } = body;

  // Map simple "cobrada"/"sin-cobrar" to enum
  const estadoEnum =
    estado === "cobrada" ? "COBRADA"
    : estado === "sin-cobrar" ? "PENDIENTE"
    : estado; // allow direct enum values too

  const validEstados = ["PENDIENTE", "PARCIALMENTE_COBRADA", "COBRADA", "ANULADA"];
  if (!validEstados.includes(estadoEnum)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const factura = await db.factura.update({
    where: { id },
    data: { estado: estadoEnum as "PENDIENTE" | "PARCIALMENTE_COBRADA" | "COBRADA" | "ANULADA" },
  });

  return NextResponse.json({ data: factura });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (userRol !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores pueden borrar facturas" }, { status: 403 });
  }

  const { id } = await params;

  // Soft delete: mark as ANULADA
  const factura = await db.factura.update({
    where: { id },
    data: { estado: "ANULADA" },
  });

  return NextResponse.json({ data: factura });
}
