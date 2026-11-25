import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pagoUpdateSchema } from "@/lib/validations";
import { TOLERANCIA, recalcularEstadoFactura, redondear, saldoFactura } from "@/lib/cuentaCorriente";

class CobroError extends Error {}

async function requireStaff() {
  const session = await auth();
  if (!session) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireStaff();
  if ("error" in authResult && authResult.error) return authResult.error;

  const { id } = await params;
  const body = await req.json();
  const parsed = pagoUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
  }

  try {
    const pago = await db.$transaction(async (tx) => {
      const actual = await tx.pago.findUnique({
        where: { id },
        include: {
          factura: {
            include: { pagos: { select: { id: true, monto: true } } },
          },
        },
      });
      if (!actual) throw new CobroError("Cobro no encontrado");

      if (data.monto !== undefined && actual.facturaId && actual.factura) {
        if (actual.factura.estado === "ANULADA") throw new CobroError("La factura está anulada");

        const otrosPagos = actual.factura.pagos.filter((p) => p.id !== id);
        const { saldo } = saldoFactura(actual.factura.montoTotal, otrosPagos);
        // El saldo disponible para este cobro = lo que falta sin contar este pago
        if (data.monto > saldo + TOLERANCIA) {
          throw new CobroError(
            `El monto supera el saldo de la factura (${redondear(saldo).toFixed(2)}). ` +
              `El máximo permitido para este cobro es ${redondear(saldo).toFixed(2)}.`
          );
        }
      }

      const actualizado = await tx.pago.update({
        where: { id },
        data: {
          ...(data.monto !== undefined && { monto: data.monto }),
          ...(data.tipoPago !== undefined && { tipoPago: data.tipoPago }),
          ...(data.fechaPago !== undefined && { fechaPago: data.fechaPago }),
          ...(data.observaciones !== undefined && { observaciones: data.observaciones || null }),
        },
      });

      if (actual.facturaId) await recalcularEstadoFactura(tx, actual.facturaId);
      return actualizado;
    });

    return NextResponse.json({
      data: {
        ...pago,
        monto: Number(pago.monto),
      },
    });
  } catch (e) {
    if (e instanceof CobroError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireStaff();
  if ("error" in authResult && authResult.error) return authResult.error;

  const { id } = await params;

  try {
    await db.$transaction(async (tx) => {
      const actual = await tx.pago.findUnique({ where: { id } });
      if (!actual) throw new CobroError("Cobro no encontrado");

      await tx.pago.delete({ where: { id } });
      if (actual.facturaId) await recalcularEstadoFactura(tx, actual.facturaId);
    });

    return NextResponse.json({ data: { id } });
  } catch (e) {
    if (e instanceof CobroError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
