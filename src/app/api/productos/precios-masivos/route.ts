import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { precioMasivoSchema } from "@/lib/validations";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rol = (session.user as { rol: string }).rol;
  if (rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const body = await req.json();
  const parsed = precioMasivoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Actualizar todos en transacción
  const updates = await db.$transaction(
    parsed.data.items.map((item) =>
      db.producto.update({
        where: { id: item.productoId },
        data: { precio: item.precio },
      })
    )
  );

  return NextResponse.json({
    data: updates,
    message: `${updates.length} precios actualizados correctamente`,
  });
}
