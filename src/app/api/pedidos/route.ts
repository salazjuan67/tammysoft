import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pedidoSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clienteId = searchParams.get("clienteId") ?? "";
  const estado = searchParams.get("estado") ?? "";
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const rangoHorario = searchParams.get("rangoHorario") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");
  const includeItems = searchParams.get("includeItems") === "true";

  const userRol = (session.user as { rol: string }).rol;
  const userClienteId = (session.user as { clienteId?: string }).clienteId;

  const where: Record<string, unknown> = {};

  // Clientes solo ven sus propios pedidos
  if (userRol === "CLIENTE" && userClienteId) {
    where.clienteId = userClienteId;
  } else if (clienteId) {
    where.clienteId = clienteId;
  }

  if (estado) where.estado = estado;
  if (rangoHorario) where.rangoHorario = rangoHorario;

  if (desde || hasta) {
    where.fechaEntrega = {
      ...(desde && { gte: new Date(desde) }),
      ...(hasta && { lte: new Date(hasta) }),
    };
  }

  const [pedidos, total] = await Promise.all([
    db.pedido.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true } },
        ...(includeItems
          ? {
              items: {
                include: { producto: { include: { categoria: true } } },
                orderBy: { producto: { nombre: "asc" } },
              },
            }
          : { _count: { select: { items: true } } }),
      },
      orderBy: [{ fechaEntrega: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.pedido.count({ where }),
  ]);

  return NextResponse.json({
    data: pedidos,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = pedidoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { clienteId, fechaEntrega, rangoHorario, notas, items } = parsed.data;
  const usuarioId = session.user.id;
  const userRol = (session.user as { rol: string }).rol;
  const userClienteId = (session.user as { clienteId?: string }).clienteId;

  // Clientes solo pueden crear pedidos para sí mismos
  if (userRol === "CLIENTE" && userClienteId !== clienteId) {
    return NextResponse.json({ error: "No podés crear pedidos para otros clientes" }, { status: 403 });
  }

  // Verificar que los productos existan y calcular precios reales
  const productosIds = items.map((i) => i.productoId);
  const productos = await db.producto.findMany({
    where: { id: { in: productosIds }, activo: true },
  });

  if (productos.length !== productosIds.length) {
    return NextResponse.json({ error: "Uno o más productos no existen o están inactivos" }, { status: 400 });
  }

  const productosMap = new Map(productos.map((p) => [p.id, p]));

  const itemsConPrecio = items.map((item) => {
    const producto = productosMap.get(item.productoId)!;
    const precioUnitario = Number(producto.precio);
    const subtotal = precioUnitario * item.cantidad;
    return { ...item, precioUnitario, subtotal };
  });

  const montoTotal = itemsConPrecio.reduce((acc, i) => acc + i.subtotal, 0);

  // Detectar si es fuera de horario principal (5-6 AM)
  const ahora = new Date();
  const hora = ahora.getHours();
  const esFueraDeHorario = rangoHorario !== "H5_6" || hora < 5 || hora >= 6;

  const pedido = await db.$transaction(async (tx) => {
    const nuevoPedido = await tx.pedido.create({
      data: {
        clienteId,
        usuarioCreadorId: usuarioId,
        fechaEntrega: new Date(fechaEntrega),
        rangoHorario,
        notas,
        montoTotal,
        items: {
          create: itemsConPrecio.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        items: { include: { producto: { include: { categoria: true } } } },
        cliente: true,
      },
    });

    // Crear alerta si es fuera del horario habitual
    if (esFueraDeHorario) {
      await tx.alerta.create({
        data: {
          pedidoId: nuevoPedido.id,
          tipo: "PEDIDO_FUERA_HORARIO",
          mensaje: `Nuevo pedido de ${nuevoPedido.cliente.nombre} cargado fuera del rango 5-6 AM (${hora}:${String(ahora.getMinutes()).padStart(2, "0")})`,
        },
      });
    }

    return nuevoPedido;
  });

  return NextResponse.json({ data: pedido }, { status: 201 });
}
