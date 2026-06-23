import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { productoSchema } from "@/lib/validations";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rol = (session.user as { rol: string }).rol;
  if (rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = productoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const producto = await db.producto.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ data: producto });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rol = (session.user as { rol: string }).rol;
  if (rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  // Soft delete
  const producto = await db.producto.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ data: producto, message: "Producto desactivado" });
}
