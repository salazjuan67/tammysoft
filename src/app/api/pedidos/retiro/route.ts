import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const retiroSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  retirado: z.boolean(),
});

/** Marca (o desmarca) que el cliente retiró pedidos ya entregados en heladera. No toca estado ni factura. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const parsed = retiroSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { ids, retirado } = parsed.data;
  const result = await db.pedido.updateMany({
    where: { id: { in: ids }, estado: "ENTREGADO" },
    data: { fechaRetiro: retirado ? new Date() : null },
  });

  return NextResponse.json({ data: { actualizados: result.count } });
}
