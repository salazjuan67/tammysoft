import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pagoProveedorSchema } from "@/lib/validations";

// Registrar pago a proveedor
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(rol)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id: proveedorId } = await params;
  const body = await req.json();
  const parsed = pagoProveedorSchema.safeParse({ ...body, proveedorId });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const pago = await db.$transaction(async (tx) => {
    const nuevoPago = await tx.pagoProveedor.create({
      data: { ...parsed.data, usuarioId: session.user.id },
    });

    // Actualizar deuda del proveedor
    await tx.proveedor.update({
      where: { id: proveedorId },
      data: { deudaActual: { decrement: parsed.data.monto } },
    });

    return nuevoPago;
  });

  return NextResponse.json({ data: pago }, { status: 201 });
}
