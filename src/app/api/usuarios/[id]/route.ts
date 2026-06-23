import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { usuarioSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { rol: string }).rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = usuarioSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { nombre, email, password, rol, activo, clienteId } = parsed.data;
  const data: Record<string, unknown> = { nombre, email, rol, activo, clienteId: clienteId || null };
  if (password) data.passwordHash = await bcrypt.hash(password, 12);

  const usuario = await db.usuario.update({
    where: { id },
    data,
    select: { id: true, email: true, nombre: true, rol: true, activo: true },
  });

  return NextResponse.json({ data: usuario });
}
