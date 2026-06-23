import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clienteSchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cliente = await db.cliente.findUnique({
    where: { id },
    include: {
      pedidos: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { _count: { select: { items: true } } },
      },
      facturas: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      pagos: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  return NextResponse.json({ data: cliente });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(rol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = clienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (data.email) {
    const existing = await db.cliente.findFirst({
      where: { email: data.email, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un cliente con ese email" }, { status: 409 });
    }
  }

  const cliente = await db.cliente.update({
    where: { id },
    data: {
      nombre: data.nombre,
      email: data.email || null,
      telefono: data.telefono || null,
      direccion: data.direccion || null,
      notas: data.notas || null,
      estado: data.estado,
    },
  });

  return NextResponse.json({ data: cliente });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rol = (session.user as { rol: string }).rol;
  if (rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores pueden eliminar clientes" }, { status: 403 });
  }

  const { id } = await params;

  // Soft delete — desactivar en lugar de eliminar
  const cliente = await db.cliente.update({
    where: { id },
    data: { estado: false },
  });

  return NextResponse.json({ data: cliente, message: "Cliente desactivado" });
}
