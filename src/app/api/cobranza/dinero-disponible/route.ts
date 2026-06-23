import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(rol))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const fechaParam = searchParams.get("fecha");

  // Build date range for the requested day (default: today)
  const base = fechaParam ? new Date(fechaParam + "T00:00:00") : new Date();
  const diaInicio = new Date(base); diaInicio.setHours(0, 0, 0, 0);
  const diaFin = new Date(base); diaFin.setHours(23, 59, 59, 999);

  // Totales acumulados históricos (toda la vida del negocio)
  const [totalCaja, totalBanco] = await Promise.all([
    db.pago.aggregate({ _sum: { monto: true }, where: { tipoPago: "EFECTIVO" } }),
    db.pago.aggregate({ _sum: { monto: true }, where: { tipoPago: "TRANSFERENCIA" } }),
  ]);

  // Movimientos del día
  const [cajaDia, bancoDia, egresosDia] = await Promise.all([
    db.pago.aggregate({ _sum: { monto: true }, where: { tipoPago: "EFECTIVO", fechaPago: { gte: diaInicio, lte: diaFin } } }),
    db.pago.aggregate({ _sum: { monto: true }, where: { tipoPago: "TRANSFERENCIA", fechaPago: { gte: diaInicio, lte: diaFin } } }),
    db.pagoProveedor.aggregate({ _sum: { monto: true }, where: { fechaPago: { gte: diaInicio, lte: diaFin } } }),
  ]);

  // Histórico 7 días
  const hace7 = new Date(); hace7.setDate(hace7.getDate() - 6); hace7.setHours(0, 0, 0, 0);
  const [pagos7, egresos7] = await Promise.all([
    db.pago.findMany({
      where: { fechaPago: { gte: hace7 } },
      select: { monto: true, tipoPago: true, fechaPago: true },
    }),
    db.pagoProveedor.findMany({
      where: { fechaPago: { gte: hace7 } },
      select: { monto: true, fechaPago: true },
    }),
  ]);

  // Build 7-day series
  const porDia: Record<string, { fecha: string; caja: number; banco: number; egresos: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    const key = d.toISOString().split("T")[0];
    porDia[key] = { fecha: key, caja: 0, banco: 0, egresos: 0 };
  }
  for (const p of pagos7) {
    const key = new Date(p.fechaPago).toISOString().split("T")[0];
    if (porDia[key]) {
      if (p.tipoPago === "EFECTIVO") porDia[key].caja += Number(p.monto);
      else porDia[key].banco += Number(p.monto);
    }
  }
  for (const e of egresos7) {
    const key = new Date(e.fechaPago).toISOString().split("T")[0];
    if (porDia[key]) porDia[key].egresos += Number(e.monto);
  }

  const enCaja = Number(totalCaja._sum.monto ?? 0);
  const enBanco = Number(totalBanco._sum.monto ?? 0);
  const total = enCaja + enBanco;

  return NextResponse.json({
    enCaja,
    enBanco,
    total,
    porcentajeCaja: total > 0 ? Math.round((enCaja / total) * 100) : 0,
    porcentajeBanco: total > 0 ? Math.round((enBanco / total) * 100) : 0,
    movimientosDia: {
      ingresoCaja: Number(cajaDia._sum.monto ?? 0),
      ingresoBanco: Number(bancoDia._sum.monto ?? 0),
      egresos: Number(egresosDia._sum.monto ?? 0),
    },
    historico7Dias: Object.values(porDia),
  });
}
