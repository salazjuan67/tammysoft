import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import type { Session } from "next-auth";

function getClienteId(session: Session | null): string | null {
  return (session?.user as { clienteId?: string })?.clienteId ?? null;
}

// ─── GET /api/cliente/pedidos ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  const clienteId = getClienteId(session);
  if (!clienteId) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const pedidos = await db.pedido.findMany({
    where: {
      clienteId,
      ...(estado && { estado: estado as never }),
      ...(desde || hasta
        ? { fechaEntrega: { ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } }
        : {}),
    },
    include: {
      items: { include: { producto: { select: { nombre: true } } } },
      factura: { select: { id: true, estado: true, montoTotal: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: JSON.parse(JSON.stringify(pedidos)) });
}

// ─── POST /api/cliente/pedidos ────────────────────────────────────────────────
const createSchema = z.object({
  items: z.array(z.object({ productoId: z.string(), cantidad: z.number().int().positive() })).min(1),
  fechaEntrega: z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha inválida"),
  rangoHorario: z.string().optional().default("SIN_ESPECIFICAR"),
  notas: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const clienteId = getClienteId(session);
  const usuarioId = session?.user?.id;
  if (!clienteId || !usuarioId) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { items, fechaEntrega, rangoHorario, notas } = parsed.data;

  // Validate: date must be tomorrow or later
  // Append T00:00:00 (no timezone) so it's parsed as local time, not UTC midnight
  const entrega = new Date(fechaEntrega + "T00:00:00");
  const manana = new Date(); manana.setDate(manana.getDate() + 1); manana.setHours(0, 0, 0, 0);
  const maxFecha = new Date(); maxFecha.setDate(maxFecha.getDate() + 30); maxFecha.setHours(23, 59, 59, 999);
  if (entrega < manana) return NextResponse.json({ error: "La fecha de entrega debe ser al menos mañana." }, { status: 400 });
  if (entrega > maxFecha) return NextResponse.json({ error: "La fecha de entrega no puede ser más de 30 días adelante." }, { status: 400 });

  // Fetch products and validate they're active
  const productIds = items.map((i) => i.productoId);
  const productos = await db.producto.findMany({ where: { id: { in: productIds }, activo: true } });
  if (productos.length !== productIds.length) {
    return NextResponse.json({ error: "Uno o más productos no existen o están inactivos." }, { status: 400 });
  }
  const prodMap = new Map(productos.map((p) => [p.id, p]));

  // Calculate totals
  const itemsData = items.map((item) => {
    const prod = prodMap.get(item.productoId)!;
    const precioUnitario = Number(prod.precio);
    return {
      productoId: item.productoId,
      cantidad: item.cantidad,
      precioUnitario,
      subtotal: precioUnitario * item.cantidad,
    };
  });
  const montoTotal = itemsData.reduce((s, i) => s + i.subtotal, 0);

  const pedido = await db.pedido.create({
    data: {
      clienteId,
      usuarioCreadorId: usuarioId,
      fechaEntrega: entrega,
      rangoHorario: rangoHorario as never,
      notas,
      montoTotal,
      items: { create: itemsData },
    },
    include: { items: true },
  });

  return NextResponse.json({ data: JSON.parse(JSON.stringify(pedido)) }, { status: 201 });
}
