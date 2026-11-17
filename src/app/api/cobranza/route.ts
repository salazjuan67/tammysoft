import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pagoSchema } from "@/lib/validations";
import { FACTURA_VIGENTE, TOLERANCIA, facturasConSaldo, recalcularEstadoFactura, saldoFactura } from "@/lib/cuentaCorriente";

class CobroError extends Error {}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo") ?? "resumen"; // resumen | pagos | deudas

  if (tipo === "resumen") {
    // Totales financieros
    const [efectivo, transferencias, facturas] = await Promise.all([
      db.pago.aggregate({
        _sum: { monto: true },
        where: { tipoPago: "EFECTIVO" },
      }),
      db.pago.aggregate({
        _sum: { monto: true },
        where: { tipoPago: "TRANSFERENCIA" },
      }),
      db.factura.findMany({
        where: FACTURA_VIGENTE,
        select: { montoTotal: true, pagos: { select: { monto: true } } },
      }),
    ]);

    return NextResponse.json({
      data: {
        totalEfectivo: Number(efectivo._sum.monto ?? 0),
        totalTransferencias: Number(transferencias._sum.monto ?? 0),
        totalCobrado: Number(efectivo._sum.monto ?? 0) + Number(transferencias._sum.monto ?? 0),
        totalDeuda: facturasConSaldo(facturas).reduce((s, f) => s + f.saldo, 0),
      },
    });
  }

  // Detalle completo de un cliente: facturas + pagos parciales
  if (tipo === "detalle-cliente") {
    const clienteId = searchParams.get("clienteId") ?? "";
    if (!clienteId) return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });

    const facturas = await db.factura.findMany({
      where: { clienteId, ...FACTURA_VIGENTE },
      include: {
        pagos: {
          select: { id: true, monto: true, tipoPago: true, fechaPago: true, observaciones: true },
          orderBy: { fechaPago: "asc" },
        },
        pedido: { select: { id: true, fechaEntrega: true } },
      },
      orderBy: { fecha: "asc" },
    });

    const data = facturasConSaldo(facturas).map(({ factura: f, totalPagado, saldo }) => ({
      id: f.id,
      numero: f.numero,
      fecha: f.fecha,
      montoTotal: Number(f.montoTotal),
      montoNeto: Number(f.montoNeto),
      montoIva: Number(f.montoIva),
      tasaIva: Number(f.tasaIva),
      totalPagado,
      saldoPendiente: saldo,
      estado: f.estado,
      pedido: f.pedido,
      pagos: f.pagos.map((p) => ({
        ...p,
        monto: Number(p.monto),
      })),
    }));

    return NextResponse.json({ data });
  }

  if (tipo === "deudas") {
    const clienteId = searchParams.get("clienteId") ?? "";
    const desde = searchParams.get("desde") ?? "";
    const hasta = searchParams.get("hasta") ?? "";

    // Deuda por cliente
    const clientes = await db.cliente.findMany({
      where: {
        estado: true,
        ...(clienteId && { id: clienteId }),
      },
      include: {
        facturas: {
          where: {
            ...FACTURA_VIGENTE,
            // Filtrar por fecha de entrega del pedido asociado
            ...(desde || hasta ? {
              pedido: {
                fechaEntrega: {
                  ...(desde && { gte: new Date(desde + "T00:00:00") }),
                  ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
                },
              },
            } : {}),
          },
          include: {
            pagos: { select: { monto: true } },
            pedido: { select: { fechaEntrega: true } },
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    const clientesConDeuda = clientes
      .map((c) => {
        const pendientes = facturasConSaldo(c.facturas);
        const deuda = pendientes.reduce((acc, f) => acc + f.saldo, 0);
        // Fecha de entrega más antigua entre las facturas pendientes
        const fechasEntrega = pendientes
          .map((f) => f.factura.pedido?.fechaEntrega)
          .filter(Boolean) as Date[];
        const fechaEntregaMasAntigua = fechasEntrega.length > 0
          ? fechasEntrega.reduce((oldest, d) => d < oldest ? d : oldest).toISOString()
          : null;
        // Fecha de factura más antigua (para referencia)
        const fechaPrimerFactura = pendientes.length > 0
          ? pendientes.reduce((oldest, f) => f.factura.fecha < oldest ? f.factura.fecha : oldest, pendientes[0].factura.fecha).toISOString()
          : null;
        return { id: c.id, nombre: c.nombre, deuda, cantidadFacturas: pendientes.length, fechaPrimerFactura, fechaEntregaMasAntigua };
      })
      .filter((c) => c.deuda > TOLERANCIA)
      .sort((a, b) => b.deuda - a.deuda);

    return NextResponse.json({ data: clientesConDeuda });
  }

  // Pagos recientes
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const clienteId = searchParams.get("clienteId") ?? "";

  const pagos = await db.pago.findMany({
    where: {
      ...(clienteId && { clienteId }),
      ...(desde || hasta ? {
        fechaPago: {
          ...(desde && { gte: new Date(desde) }),
          ...(hasta && { lte: new Date(hasta) }),
        },
      } : {}),
    },
    include: {
      cliente: { select: { id: true, nombre: true } },
      factura: { select: { id: true, numero: true } },
      usuario: { select: { id: true, nombre: true } },
    },
    orderBy: { fechaPago: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: pagos });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = pagoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { clienteId, facturaId, monto, tipoPago, fechaPago, observaciones } = parsed.data;

  if (!facturaId) {
    return NextResponse.json({ error: "Indicá la factura a la que se aplica el cobro" }, { status: 400 });
  }

  try {
    const pago = await db.$transaction(async (tx) => {
      const factura = await tx.factura.findUnique({
        where: { id: facturaId },
        include: { pagos: { select: { monto: true } } },
      });
      if (!factura || factura.clienteId !== clienteId) throw new CobroError("La factura no pertenece al cliente");
      if (factura.estado === "ANULADA") throw new CobroError("La factura está anulada");

      const { saldo } = saldoFactura(factura.montoTotal, factura.pagos);
      if (monto > saldo + TOLERANCIA) {
        throw new CobroError(`El monto supera el saldo pendiente de la factura (${saldo.toFixed(2)})`);
      }

      const nuevoPago = await tx.pago.create({
        data: {
          clienteId,
          facturaId,
          monto,
          tipoPago,
          fechaPago,
          observaciones,
          usuarioId: session.user.id,
        },
      });

      await recalcularEstadoFactura(tx, facturaId);
      return nuevoPago;
    });

    return NextResponse.json({ data: pago }, { status: 201 });
  } catch (e) {
    if (e instanceof CobroError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
