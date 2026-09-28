import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/tipos-cliente/[id] — actualizar nombre/descripción/activo
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rol = (session.user as { rol: string }).rol;
  if (rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { nombre, descripcion, activo } = body;

  const data: Record<string, unknown> = {};
  if (nombre !== undefined) data.nombre = nombre.trim();
  if (descripcion !== undefined) data.descripcion = descripcion?.trim() || null;
  if (activo !== undefined) data.activo = activo;

  const tipo = await db.tipoCliente.update({ where: { id }, data });
  return NextResponse.json({ data: tipo });
}

// DELETE /api/tipos-cliente/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rol = (session.user as { rol: string }).rol;
  if (rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;

  // Desvincular clientes primero
  await db.cliente.updateMany({ where: { tipoClienteId: id }, data: { tipoClienteId: null } });
  await db.tipoCliente.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

// PUT /api/tipos-cliente/[id] — guardar descuentos masivos (bulk upsert)
// Body: { descuentos: [{ productoId, descuento }] }  descuento: 0-100 (porcentaje)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rol = (session.user as { rol: string }).rol;
  if (rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const items: Array<{ productoId: string; descuento: number }> = body.descuentos ?? [];

  // Eliminar todos los descuentos actuales del tipo y re-insertar
  await db.descuentoProducto.deleteMany({ where: { tipoClienteId: id } });

  if (items.length > 0) {
    await db.descuentoProducto.createMany({
      data: items
        .filter((i) => i.descuento > 0) // solo guardar descuentos > 0
        .map((i) => ({
          tipoClienteId: id,
          productoId: i.productoId,
          descuento: i.descuento / 100, // guardar como 0-1
        })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true });
}
