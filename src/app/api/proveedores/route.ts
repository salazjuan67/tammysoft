import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { proveedorSchema, pagoProveedorSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const proveedores = await db.proveedor.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    include: { _count: { select: { pagos: true } } },
  });

  return NextResponse.json({ data: proveedores });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(rol)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const body = await req.json();
  const parsed = proveedorSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const proveedor = await db.proveedor.create({ data: parsed.data });
  return NextResponse.json({ data: proveedor }, { status: 201 });
}
