import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

  // "cobrada" → COBRADA | "sin-cobrar" → PENDIENTE + PARCIALMENTE_COBRADA | "todas" → sin filtro
  if (estadoFiltro === "cobrada") {
    where.estado = "COBRADA";
  } else if (estadoFiltro === "sin-cobrar") {
    where.estado = { in: ["PENDIENTE", "PARCIALMENTE_COBRADA"] };
  }

  if (desde || hasta) {
    where.fecha = {
      ...(desde && { gte: new Date(desde) }),
      ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
    };
  }

  const [facturas, total] = await Promise.all([
    db.factura.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true } },
        pagos: { select: { monto: true } },
      },
      orderBy: { fecha: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.factura.count({ where }),
  ]);

  const data = facturas.map(({ pagos, ...f }) => {
    const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0);
    const saldoPendiente = Math.max(0, Number(f.montoTotal) - totalPagado);
    return {
      ...f,
      montoTotal: Number(f.montoTotal),
      montoNeto: Number(f.montoNeto),
      montoIva: Number(f.montoIva),
      tasaIva: Number(f.tasaIva),
      saldoPendiente,
    };
  });

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
