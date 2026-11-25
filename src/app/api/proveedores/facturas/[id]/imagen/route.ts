import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  const factura = await db.facturaProveedor.findUnique({
    where: { id },
    select: { imagenData: true, imagenMime: true },
  });
  if (!factura?.imagenData || !factura.imagenMime) {
    return NextResponse.json({ error: "Sin imagen" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(factura.imagenData), {
    headers: {
      "Content-Type": factura.imagenMime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
