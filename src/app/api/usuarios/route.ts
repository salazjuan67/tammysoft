import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { usuarioSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { rol: string }).rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const usuarios = await db.usuario.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, email: true, nombre: true, rol: true, activo: true, createdAt: true, clienteId: true },
  });

  return NextResponse.json({ data: usuarios });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { rol: string }).rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const body = await req.json();
  const parsed = usuarioSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { nombre, email, password, rol, activo, clienteId } = parsed.data;
  if (!password) return NextResponse.json({ error: "La contraseña es requerida para nuevos usuarios" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const usuario = await db.usuario.create({
      data: { nombre, email, passwordHash, rol, activo, clienteId: clienteId || null },
      select: { id: true, email: true, nombre: true, rol: true, activo: true },
    });
    return NextResponse.json({ data: usuario }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }
}
