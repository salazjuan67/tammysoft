import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pedidoSchema } from "@/lib/validations";
import { puedeEditarPedido } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const pedido = await db.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      usuarioCreador: { select: { id: true, nombre: true } },
      usuarioEditor: { select: { id: true, nombre: true } },
      items: {
        include: {
          producto: { include: { categoria: true } },
        },
        orderBy: { producto: { nombre: "asc" } },
      },
      factura: true,
    },
  });

  if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const userRol = (session.user as { rol: string }).rol;
  const userClienteId = (session.user as { clienteId?: string }).clienteId;

  // Clientes solo ven sus pedidos
  if (userRol === "CLIENTE" && pedido.clienteId !== userClienteId) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const puedeEditar = puedeEditarPedido(pedido.fechaEntrega, pedido.createdAt);

  return NextResponse.json({ data: { ...pedido, puedeEditar } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const pedidoActual = await db.pedido.findUnique({ where: { id } });
  if (!pedidoActual) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const userRol = (session.user as { rol: string }).rol;
  const userClienteId = (session.user as { clienteId?: string }).clienteId;

  // Clientes solo editan sus propios pedidos
  if (userRol === "CLIENTE" && pedidoActual.clienteId !== userClienteId) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // Validar ventana de edición (clientes) — admins pueden siempre
  if (userRol === "CLIENTE" || userRol === "VENDEDOR") {
    if (!puedeEditarPedido(pedidoActual.fechaEntrega, pedidoActual.createdAt)) {
      return NextResponse.json(
        { error: "El plazo para editar este pedido ya venció (12 PM del día anterior o 2 horas desde la creación)" },
        { status: 403 }
      );
    }
  }

  // No se puede editar un pedido entregado/cancelado
  if (["ENTREGADO", "CANCELADO"].includes(pedidoActual.estado)) {
    return NextResponse.json({ error: "No se puede editar un pedido entregado o cancelado" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = pedidoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { items, ...pedidoData } = parsed.data;

  // Recalcular precios
  const productosIds = items.map((i) => i.productoId);
  const productos = await db.producto.findMany({
    where: { id: { in: productosIds }, activo: true },
  });
  const productosMap = new Map(productos.map((p) => [p.id, p]));

  const itemsConPrecio = items.map((item) => {
    const producto = productosMap.get(item.productoId)!;
    const precioUnitario = Number(producto.precio);
    return { ...item, precioUnitario, subtotal: precioUnitario * item.cantidad };
  });

  const montoTotal = itemsConPrecio.reduce((acc, i) => acc + i.subtotal, 0);

  const pedido = await db.$transaction(async (tx) => {
    // Eliminar items anteriores y recrear
    await tx.pedidoItem.deleteMany({ where: { pedidoId: id } });

    return tx.pedido.update({
      where: { id },
      data: {
        ...pedidoData,
        fechaEntrega: new Date(pedidoData.fechaEntrega),
        montoTotal,
        usuarioEditorId: session.user.id,
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
  });

  return NextResponse.json({ data: pedido });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const pedido = await db.pedido.findUnique({
    where: { id },
    include: { factura: true },
  });

  if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const userRol = (session.user as { rol: string }).rol;
  const userClienteId = (session.user as { clienteId?: string }).clienteId;

  if (userRol === "CLIENTE" && pedido.clienteId !== userClienteId) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (pedido.factura) {
    return NextResponse.json(
      { error: "No se puede eliminar un pedido con factura asociada" },
      { status: 400 }
    );
  }

  if (userRol === "CLIENTE" || userRol === "VENDEDOR") {
    if (!puedeEditarPedido(pedido.fechaEntrega, pedido.createdAt)) {
      return NextResponse.json({ error: "El plazo para cancelar este pedido ya venció" }, { status: 403 });
    }
  }

  // Cambiar estado a CANCELADO (soft delete)
  const pedidoCancelado = await db.pedido.update({
    where: { id },
    data: { estado: "CANCELADO" },
  });

  return NextResponse.json({ data: pedidoCancelado, message: "Pedido cancelado" });
}
