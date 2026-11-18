import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FACTURA_VIGENTE, TOLERANCIA, importeArca, saldoFactura } from "@/lib/cuentaCorriente";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO", "VENDEDOR"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clienteId = searchParams.get("clienteId") ?? "";
  const estadoFiltro = searchParams.get("estado") ?? "todas";
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (clienteId) where.clienteId = clienteId;

  const arcaFiltro = searchParams.get("arca") ?? "";
  if (arcaFiltro === "pendiente") where.facturadoArca = false;
  else if (arcaFiltro === "facturado") where.facturadoArca = true;

  // "cobrada" y "sin-cobrar" se deciden por el saldo real, no por el estado guardado
  if (estadoFiltro === "cobrada" || estadoFiltro === "sin-cobrar") {
    where.estado = FACTURA_VIGENTE.estado;
  }

  if (desde || hasta) {
    where.fecha = {
      ...(desde && { gte: new Date(desde) }),
      ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
    };
  }

  const facturas = await db.factura.findMany({
    where,
    include: {
      cliente: { select: { id: true, nombre: true } },
      pagos: { select: { monto: true } },
    },
    orderBy: { fecha: "desc" },
  });

  const filtradas = facturas
    .map(({ pagos, ...f }) => {
      const { saldo } = saldoFactura(f.montoTotal, pagos);
      return {
        ...f,
        montoTotal: Number(f.montoTotal),
        montoNeto: Number(f.montoNeto),
        montoIva: Number(f.montoIva),
        tasaIva: Number(f.tasaIva),
        saldoPendiente: f.estado === "ANULADA" ? 0 : saldo,
        porcentajeArca: Number(f.porcentajeArca),
        tasaIvaArca: Number(f.tasaIvaArca),
        arca: importeArca(f.montoTotal, f.porcentajeArca, f.tasaIvaArca),
      };
    })
    .filter((f) =>
      estadoFiltro === "sin-cobrar" ? f.saldoPendiente > TOLERANCIA
      : estadoFiltro === "cobrada" ? f.saldoPendiente <= TOLERANCIA
      : true
    );

  const total = filtradas.length;
  const data = filtradas.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const { pedidoId } = body;

  if (!pedidoId) return NextResponse.json({ error: "pedidoId requerido" }, { status: 400 });

  const pedido = await db.pedido.findUnique({
    where: { id: pedidoId },
    include: { factura: true },
  });

  if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (pedido.factura) return NextResponse.json({ error: "El pedido ya tiene factura" }, { status: 409 });

  const factura = await db.factura.create({
    data: {
      pedidoId,
      clienteId: pedido.clienteId,
      montoNeto: Number(pedido.montoTotal),
      montoIva: 0,
      montoTotal: Number(pedido.montoTotal),
      tasaIva: 0,
    },
  });

  return NextResponse.json({ data: factura }, { status: 201 });
}
