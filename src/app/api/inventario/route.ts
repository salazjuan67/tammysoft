import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const items = await db.materiaPrima.findMany({
    where: {
      activo: true,
      ...(q ? { nombre: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({
    data: items.map((i) => ({
      ...i,
      stockActual: Number(i.stockActual),
      stockMinimo: Number(i.stockMinimo),
      bajoMinimo: Number(i.stockActual) <= Number(i.stockMinimo),
    })),
  });
}

const ajusteSchema = z.object({
  materiaPrimaId: z.string().min(1),
  stockActual: z.coerce.number().min(0),
  stockMinimo: z.coerce.number().min(0).optional(),
  observaciones: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const parsed = ajusteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { materiaPrimaId, stockActual, stockMinimo, observaciones } = parsed.data;

  const actualizada = await db.$transaction(async (tx) => {
    const actual = await tx.materiaPrima.findUnique({ where: { id: materiaPrimaId } });
    if (!actual) throw new Error("NO_EXISTE");
    const delta = Math.round((stockActual - Number(actual.stockActual)) * 1000) / 1000;
    const updated = await tx.materiaPrima.update({
      where: { id: materiaPrimaId },
      data: {
        stockActual,
        ...(stockMinimo !== undefined ? { stockMinimo } : {}),
      },
    });
    if (delta !== 0) {
      await tx.movimientoStock.create({
        data: {
          materiaPrimaId,
          tipo: "AJUSTE",
          cantidad: delta,
          saldoResultante: stockActual,
          usuarioId: session.user.id,
          observaciones: observaciones || "Ajuste manual de inventario",
        },
      });
    }
    return updated;
  }).catch((e) => {
    if (e instanceof Error && e.message === "NO_EXISTE") return null;
    throw e;
  });

  if (!actualizada) return NextResponse.json({ error: "Insumo no encontrado" }, { status: 404 });

  return NextResponse.json({
    data: {
      ...actualizada,
      stockActual: Number(actualizada.stockActual),
      stockMinimo: Number(actualizada.stockMinimo),
    },
  });
}
