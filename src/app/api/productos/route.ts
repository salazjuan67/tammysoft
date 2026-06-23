import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { productoSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const categoriaId = searchParams.get("categoriaId") ?? "";
  const soloActivos = searchParams.get("activos") !== "false";

  const productos = await db.producto.findMany({
    where: {
      ...(soloActivos && { activo: true }),
      ...(categoriaId && { categoriaId }),
      ...(search && {
        nombre: { contains: search, mode: "insensitive" },
      }),
    },
    include: { categoria: true },
    orderBy: [{ categoria: { orden: "asc" } }, { nombre: "asc" }],
  });

  return NextResponse.json({ data: productos });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rol = (session.user as { rol: string }).rol;
  if (rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores pueden crear productos" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = productoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const producto = await db.producto.create({ data: parsed.data });
  return NextResponse.json({ data: producto }, { status: 201 });
}
