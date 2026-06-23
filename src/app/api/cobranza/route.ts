import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pagoSchema } from "@/lib/validations";

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
    const [efectivo, transferencias, deudaTotal] = await Promise.all([
      db.pago.aggregate({
        _sum: { monto: true },
        where: { tipoPago: "EFECTIVO" },
      }),
      db.pago.aggregate({
        _sum: { monto: true },
        where: { tipoPago: "TRANSFERENCIA" },
      }),
      db.factura.aggregate({
        _sum: { montoTotal: true },
        where: { estado: { in: ["PENDIENTE", "PARCIALMENTE_COBRADA"] } },
      }),
    ]);

    return NextResponse.json({
      data: {
        totalEfectivo: Number(efectivo._sum.monto ?? 0),
        totalTransferencias: Number(transferencias._sum.monto ?? 0),
        totalCobrado: Number(efectivo._sum.monto ?? 0) + Number(transferencias._sum.monto ?? 0),
        totalDeuda: Number(deudaTotal._sum.montoTotal ?? 0),
      },
    });
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
            estado: { in: ["PENDIENTE", "PARCIALMENTE_COBRADA"] },
            ...(desde || hasta ? {
              fecha: {
                ...(desde && { gte: new Date(desde + "T00:00:00") }),
                ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
              },
            } : {}),
          },
          include: { pagos: { select: { monto: true } } },
        },
      },
      orderBy: { nombre: "asc" },
    });

    const clientesConDeuda = clientes
      .map((c) => {
        const deuda = c.facturas.reduce((acc, f) => {
          const pagado = f.pagos.reduce((s, p) => s + Number(p.monto), 0);
          return acc + Number(f.montoTotal) - pagado;
        }, 0);
        return { id: c.id, nombre: c.nombre, deuda, cantidadFacturas: c.facturas.length };
      })
      .filter((c) => c.deuda > 0)
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

  const pago = await db.$transaction(async (tx) => {
    const nuevoPago = await tx.pago.create({
      data: {
        clienteId,
        facturaId: facturaId || null,
        monto,
        tipoPago,
        fechaPago,
        observaciones,
        usuarioId: session.user.id,
      },
    });

    // Actualizar estado de factura si aplica
    if (facturaId) {
      const factura = await tx.factura.findUnique({
        where: { id: facturaId },
        include: { pagos: { select: { monto: true } } },
      });

      if (factura) {
        const totalPagado = [...factura.pagos, { monto: monto }].reduce(
          (acc, p) => acc + Number(p.monto),
          0
        );
        const montoTotal = Number(factura.montoTotal);

        let nuevoEstado: "PENDIENTE" | "PARCIALMENTE_COBRADA" | "COBRADA" = "PENDIENTE";
        if (totalPagado >= montoTotal) {
          nuevoEstado = "COBRADA";
        } else if (totalPagado > 0) {
          nuevoEstado = "PARCIALMENTE_COBRADA";
        }

        await tx.factura.update({
          where: { id: facturaId },
          data: { estado: nuevoEstado },
        });
      }
    }

    return nuevoPago;
  });

  return NextResponse.json({ data: pago }, { status: 201 });
}
