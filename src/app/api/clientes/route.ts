import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clienteSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const soloActivos = searchParams.get("activos") !== "false";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50");

  const where = {
    ...(soloActivos && { estado: true }),
    ...(search && {
      OR: [
        { nombre: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { telefono: { contains: search } },
      ],
    }),
  };

  const [clientes, total] = await Promise.all([
    db.cliente.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { pedidos: true } },
      },
    }),
    db.cliente.count({ where }),
  ]);

  return NextResponse.json({
    data: clientes,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(rol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = clienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Check duplicate email
  if (data.email) {
    const existing = await db.cliente.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un cliente con ese email" }, { status: 409 });
    }
  }

  const cliente = await db.cliente.create({
    data: {
      nombre: data.nombre,
      email: data.email || null,
      telefono: data.telefono || null,
      direccion: data.direccion || null,
      notas: data.notas || null,
      estado: data.estado,
    },
  });

  return NextResponse.json({ data: cliente }, { status: 201 });
}
