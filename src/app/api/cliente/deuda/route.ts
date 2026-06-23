import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const clienteId = (session?.user as { clienteId?: string })?.clienteId;
  if (!clienteId) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const ahora = new Date();

  const facturas = await db.factura.findMany({
    where: {
      clienteId,
      estado: { in: ["PENDIENTE", "PARCIALMENTE_COBRADA"] },
    },
    include: {
      pagos: { select: { monto: true } },
    },
    orderBy: { fecha: "asc" },
  });

  let deudaTotal = 0;
  const porFactura = facturas.map((f) => {
    const pagado = f.pagos.reduce((s, p) => s + Number(p.monto), 0);
    const saldo = Number(f.montoTotal) - pagado;
    const dias = Math.floor((ahora.getTime() - new Date(f.fecha).getTime()) / (1000 * 60 * 60 * 24));
    const semaforo = dias >= 60 ? "rojo" : dias >= 30 ? "naranja" : dias >= 15 ? "amarillo" : "verde";
    deudaTotal += saldo;
    return { facturaId: f.id, numero: f.numero, fecha: f.fecha, montoTotal: Number(f.montoTotal), saldo, diasSinPagar: dias, semaforo, estado: f.estado };
  });

  return NextResponse.json({ deudaTotal, porFactura: JSON.parse(JSON.stringify(porFactura)) });
}
