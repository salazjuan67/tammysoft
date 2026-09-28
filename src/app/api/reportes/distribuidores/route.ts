import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const clienteId = searchParams.get("clienteId") ?? "";

  // Pedidos entregados en el período
  const pedidos = await db.pedido.findMany({
    where: {
      estado: "ENTREGADO",
      ...(clienteId && { clienteId }),
      ...(desde || hasta ? {
        fechaEntrega: {
          ...(desde && { gte: new Date(desde + "T00:00:00") }),
          ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
        },
      } : {}),
    },
    include: {
      cliente: { select: { id: true, nombre: true } },
      factura: {
        include: {
          pagos: { select: { monto: true, tipoPago: true } },
        },
      },
    },
    orderBy: [{ cliente: { nombre: "asc" } }, { fechaEntrega: "asc" }],
  });

  // Agrupar por distribuidor → cliente final (notas)
  const distribuidores: Record<string, {
    id: string;
    nombre: string;
    clientes: Record<string, {
      clienteNombre: string;
      cantidadPedidos: number;
      montoTotal: number;
      efectivoCobrado: number;
      transferenciaCobrada: number;
      ivaTotal: number;
      saldoPendiente: number;
    }>;
    totales: {
      cantidadPedidos: number;
      montoTotal: number;
      efectivoCobrado: number;
      transferenciaCobrada: number;
      ivaTotal: number;
      saldoPendiente: number;
    };
  }> = {};

  for (const pedido of pedidos) {
    const distId = pedido.clienteId;
    const distNombre = pedido.cliente.nombre;
    const clienteNombre = pedido.notas || "(sin especificar)";

    if (!distribuidores[distId]) {
      distribuidores[distId] = {
        id: distId,
        nombre: distNombre,
        clientes: {},
        totales: { cantidadPedidos: 0, montoTotal: 0, efectivoCobrado: 0, transferenciaCobrada: 0, ivaTotal: 0, saldoPendiente: 0 },
      };
    }

    if (!distribuidores[distId].clientes[clienteNombre]) {
      distribuidores[distId].clientes[clienteNombre] = {
        clienteNombre,
        cantidadPedidos: 0,
        montoTotal: 0,
        efectivoCobrado: 0,
        transferenciaCobrada: 0,
        ivaTotal: 0,
        saldoPendiente: 0,
      };
    }

    const monto = Number(pedido.montoTotal);
    const ivaFactura = pedido.factura ? Number(pedido.factura.montoIva) : 0;
    const totalFacturado = pedido.factura ? Number(pedido.factura.montoTotal) : 0;
    const efectivo = pedido.factura
      ? pedido.factura.pagos.filter((p) => p.tipoPago === "EFECTIVO").reduce((s, p) => s + Number(p.monto), 0)
      : 0;
    const transferencia = pedido.factura
      ? pedido.factura.pagos.filter((p) => p.tipoPago === "TRANSFERENCIA").reduce((s, p) => s + Number(p.monto), 0)
      : 0;
    const totalPagado = efectivo + transferencia;
    const saldo = Math.max(0, totalFacturado - totalPagado);

    const c = distribuidores[distId].clientes[clienteNombre];
    c.cantidadPedidos += 1;
    c.montoTotal += monto;
    c.efectivoCobrado += efectivo;
    c.transferenciaCobrada += transferencia;
    c.ivaTotal += ivaFactura;
    c.saldoPendiente += saldo;

    const t = distribuidores[distId].totales;
    t.cantidadPedidos += 1;
    t.montoTotal += monto;
    t.efectivoCobrado += efectivo;
    t.transferenciaCobrada += transferencia;
    t.ivaTotal += ivaFactura;
    t.saldoPendiente += saldo;
  }

  const clientes = await db.cliente.findMany({
    where: { estado: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({
    data: Object.values(distribuidores),
    clientes,
  });
}
