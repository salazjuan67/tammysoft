import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { validarEdicionPedido } from "@/lib/validarEdicion";
import type { Session } from "next-auth";

function getClienteId(session: Session | null): string | null {
  return (session?.user as { clienteId?: string })?.clienteId ?? null;
}

// ─── GET /api/cliente/pedidos/[id] ────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const clienteId = getClienteId(session);
  if (!clienteId) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const { id } = await params;
  const pedido = await db.pedido.findFirst({
    where: { id, clienteId },
    include: {
      items: {
        include: { producto: { include: { categoria: { select: { nombre: true } } } } },
      },
      factura: { select: { id: true, estado: true, montoTotal: true, numero: true } },
    },
  });

  if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const validacion = validarEdicionPedido(pedido);

  return NextResponse.json({ data: JSON.parse(JSON.stringify({ ...pedido, validacion })) });
}

// ─── PUT /api/cliente/pedidos/[id] ────────────────────────────────────────────
const updateSchema = z.object({
  items: z.array(z.object({ productoId: z.string(), cantidad: z.number().int().positive() })).min(1),
  fechaEntrega: z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha inválida"),
  rangoHorario: z.string().optional().default("SIN_ESPECIFICAR"),
  notas: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const clienteId = getClienteId(session);
  const usuarioId = session?.user?.id;
  if (!clienteId || !usuarioId) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const { id } = await params;

  const pedido = await db.pedido.findFirst({ where: { id, clienteId } });
  if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const validacion = validarEdicionPedido(pedido);
  if (!validacion.puede_editar) {
    return NextResponse.json({ error: validacion.motivo }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { items, fechaEntrega, rangoHorario, notas } = parsed.data;

  // Validate date (parse as local time to avoid UTC offset issues)
  const entrega = new Date(fechaEntrega + "T00:00:00");
  const manana = new Date(); manana.setDate(manana.getDate() + 1); manana.setHours(0, 0, 0, 0);
  if (entrega < manana) return NextResponse.json({ error: "La fecha de entrega debe ser al menos mañana." }, { status: 400 });

  // Validate products
  const productIds = items.map((i) => i.productoId);
  const productos = await db.producto.findMany({ where: { id: { in: productIds }, activo: true } });
  if (productos.length !== productIds.length) {
    return NextResponse.json({ error: "Uno o más productos no existen o están inactivos." }, { status: 400 });
  }
  const prodMap = new Map(productos.map((p) => [p.id, p]));

  const itemsData = items.map((item) => {
    const prod = prodMap.get(item.productoId)!;
    const precioUnitario = Number(prod.precio);
    return { productoId: item.productoId, cantidad: item.cantidad, precioUnitario, subtotal: precioUnitario * item.cantidad };
  });
  const montoTotal = itemsData.reduce((s, i) => s + i.subtotal, 0);

  // Replace items and update pedido atomically
  const [, updated] = await db.$transaction([
    db.pedidoItem.deleteMany({ where: { pedidoId: id } }),
    db.pedido.update({
      where: { id },
      data: {
        fechaEntrega: entrega,
        rangoHorario: rangoHorario as never,
        notas,
        montoTotal,
        usuarioEditorId: usuarioId,
        items: { create: itemsData },
      },
      include: { items: true },
    }),
  ]);

  return NextResponse.json({ data: JSON.parse(JSON.stringify(updated)) });
}

// ─── DELETE /api/cliente/pedidos/[id] ─────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const clienteId = getClienteId(session);
  if (!clienteId) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const { id } = await params;
  const pedido = await db.pedido.findFirst({ where: { id, clienteId } });
  if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (pedido.estado !== "PENDIENTE") {
    return NextResponse.json({ error: `No se puede cancelar un pedido en estado ${pedido.estado}.` }, { status: 409 });
  }

  const cancelado = await db.pedido.update({
    where: { id },
    data: { estado: "CANCELADO" },
  });

  return NextResponse.json({ data: JSON.parse(JSON.stringify(cancelado)) });
}
