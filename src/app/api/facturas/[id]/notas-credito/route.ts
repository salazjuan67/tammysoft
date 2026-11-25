import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  TOLERANCIA,
  montoACobrar,
  montoACobrarBruto,
  recalcularEstadoFactura,
  redondear,
  totalNotasCredito,
} from "@/lib/cuentaCorriente";

const schema = z.object({
  /** Si es true, se acredita todo el monto vigente restante. */
  total: z.boolean().optional().default(false),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0").optional(),
  motivo: z.string().trim().max(500).optional(),
  comprobanteArca: z.string().trim().max(50).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const notas = await db.notaCredito.findMany({
    where: { facturaId: id },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json({
    data: notas.map((n) => ({
      ...n,
      monto: Number(n.monto),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { total, motivo, comprobanteArca } = parsed.data;

  const resultado = await db.$transaction(async (tx) => {
    const factura = await tx.factura.findUnique({
      where: { id },
      include: {
        pagos: { select: { monto: true } },
        notasCredito: { select: { monto: true } },
      },
    });
    if (!factura) return { error: "Factura no encontrada", status: 404 as const };
    if (factura.estado === "ANULADA") {
      return { error: "La factura ya está anulada", status: 400 as const };
    }

    const bruto = montoACobrarBruto(factura);
    const yaAcreditado = totalNotasCredito(factura.notasCredito);
    const restante = redondear(Math.max(0, bruto - yaAcreditado));
    if (restante <= TOLERANCIA) {
      return { error: "No queda monto para acreditar en esta factura", status: 400 as const };
    }

    let monto = total ? restante : redondear(Number(parsed.data.monto ?? 0));
    if (!total && (!parsed.data.monto || monto <= 0)) {
      return { error: "Ingresá el monto de la nota de crédito", status: 400 as const };
    }
    if (monto > restante + TOLERANCIA) {
      return {
        error: `El monto supera el restante de la factura (${restante.toFixed(2)})`,
        status: 400 as const,
      };
    }
    monto = Math.min(monto, restante);

    const nota = await tx.notaCredito.create({
      data: {
        facturaId: id,
        monto,
        motivo: motivo || (monto >= restante - TOLERANCIA ? "Anulación total" : "Nota de crédito parcial"),
        comprobanteArca: comprobanteArca || null,
        usuarioId: session.user.id,
      },
    });

    const estado = await recalcularEstadoFactura(tx, id);
    const actualizada = await tx.factura.findUnique({
      where: { id },
      include: {
        pagos: { select: { monto: true } },
        notasCredito: { select: { monto: true } },
      },
    });

    return {
      nota: { ...nota, monto: Number(nota.monto) },
      estado,
      montoACobrar: actualizada ? montoACobrar(actualizada) : 0,
    };
  });

  if ("error" in resultado && resultado.error) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }

  return NextResponse.json({ data: resultado }, { status: 201 });
}
