import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { importeArca } from "@/lib/cuentaCorriente";

const arcaSchema = z.object({
  porcentajeArca: z.number().min(0).max(100).optional(),
  tasaIvaArca: z.union([z.literal(0.21), z.literal(0.105)]).optional(),
  facturadoArca: z.boolean().optional(),
  comprobanteArca: z.string().trim().max(50).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const parsed = arcaSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { porcentajeArca, tasaIvaArca, facturadoArca, comprobanteArca } = parsed.data;

  const { id } = await params;
  const factura = await db.factura.findUnique({ where: { id } });
  if (!factura) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  if (factura.estado === "ANULADA") {
    return NextResponse.json({ error: "La factura está anulada" }, { status: 400 });
  }

  const cambiaImporte = porcentajeArca !== undefined || tasaIvaArca !== undefined;
  const quedaFacturada = facturadoArca ?? factura.facturadoArca;
  if (cambiaImporte && quedaFacturada) {
    return NextResponse.json(
      { error: "Ya está facturada en ARCA; desmarcala para cambiar el porcentaje o el IVA" },
      { status: 409 }
    );
  }

  const data: Record<string, unknown> = {};
  if (porcentajeArca !== undefined) data.porcentajeArca = porcentajeArca / 100;
  if (tasaIvaArca !== undefined) data.tasaIvaArca = tasaIvaArca;
  if (facturadoArca === true) {
    if (!comprobanteArca) {
      return NextResponse.json({ error: "Ingresá el número de comprobante de ARCA" }, { status: 400 });
    }
    if (Number(factura.porcentajeArca) <= 0) {
      return NextResponse.json({ error: "Primero indicá qué porcentaje se factura" }, { status: 400 });
    }
    data.facturadoArca = true;
    data.comprobanteArca = comprobanteArca;
    data.fechaArca = new Date();
  } else if (facturadoArca === false) {
    data.facturadoArca = false;
    data.comprobanteArca = null;
    data.fechaArca = null;
  }

  const actualizada = await db.factura.update({ where: { id }, data });

  return NextResponse.json({
    data: {
      id: actualizada.id,
      porcentajeArca: Number(actualizada.porcentajeArca),
      tasaIvaArca: Number(actualizada.tasaIvaArca),
      facturadoArca: actualizada.facturadoArca,
      comprobanteArca: actualizada.comprobanteArca,
      fechaArca: actualizada.fechaArca,
      arca: importeArca(actualizada.montoTotal, actualizada.porcentajeArca, actualizada.tasaIvaArca),
    },
  });
}
