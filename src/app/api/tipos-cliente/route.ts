import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/tipos-cliente — lista todos los tipos con conteo de clientes
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipos = await db.tipoCliente.findMany({
    orderBy: { nombre: "asc" },
    include: {
      _count: { select: { clientes: true } },
      descuentos: {
        include: { producto: { select: { id: true, nombre: true, precio: true, categoriaId: true, categoria: { select: { nombre: true, orden: true } } } } },
        orderBy: { producto: { nombre: "asc" } },
      },
    },
  });

  return NextResponse.json({ data: tipos });
}

// POST /api/tipos-cliente — crear tipo
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rol = (session.user as { rol: string }).rol;
  if (rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const body = await req.json();
  const { nombre, descripcion } = body;
  if (!nombre?.trim()) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });

  const tipo = await db.tipoCliente.create({
    data: { nombre: nombre.trim(), descripcion: descripcion?.trim() || null },
  });

  return NextResponse.json({ data: tipo }, { status: 201 });
}
