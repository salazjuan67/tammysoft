import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categoriaSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const categorias = await db.categoria.findMany({
    where: { activo: true },
    orderBy: { orden: "asc" },
    include: { _count: { select: { productos: true } } },
  });

  return NextResponse.json({ data: categorias });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rol = (session.user as { rol: string }).rol;
  if (rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const body = await req.json();
  const parsed = categoriaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const categoria = await db.categoria.create({ data: parsed.data });
    return NextResponse.json({ data: categoria }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe una categoría con ese nombre" }, { status: 409 });
  }
}
