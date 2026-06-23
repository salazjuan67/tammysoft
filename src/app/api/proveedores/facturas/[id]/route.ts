import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

function serialize(f: Record<string, unknown>) {
  return {
    ...f,
    montoNeto: Number(f.montoNeto),
    montoIva: Number(f.montoIva),
    montoTotal: Number(f.montoTotal),
  };
}

// ─── GET /api/proveedores/facturas/[id] ───────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const factura = await db.facturaProveedor.findUnique({
    where: { id },
    include: {
      proveedor: { select: { id: true, nombre: true, email: true, telefono: true } },
      pagos: {
        include: { usuario: { select: { id: true, nombre: true } } },
        orderBy: { fechaPago: "desc" },
      },
    },
  });

  if (!factura) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const totalPagado = factura.pagos.reduce((s, p) => s + Number(p.monto), 0);
  const saldoPendiente = Math.max(0, Number(factura.montoTotal) - totalPagado);
  const hoy = new Date();
  const vencida = factura.estado !== "PAGADA" && factura.fechaVencimiento != null && new Date(factura.fechaVencimiento) < hoy;

  return NextResponse.json({
    data: {
      ...serialize(factura as unknown as Record<string, unknown>),
      saldoPendiente,
      totalPagado,
      estadoMostrar: vencida ? "VENCIDA" : factura.estado,
      pagos: factura.pagos.map((p) => ({ ...p, monto: Number(p.monto) })),
    },
  });
}

// ─── PUT /api/proveedores/facturas/[id] ───────────────────────────────────────
const updateSchema = z.object({
  numeroFactura: z.string().min(1).optional(),
  fechaEmision: z.string().optional(),
  fechaVencimiento: z.string().optional().nullable(),
  montoNeto: z.number().min(0).optional(),
  montoIva: z.number().min(0).optional(),
  montoTotal: z.number().min(0).optional(),
  concepto: z.string().min(1).optional(),
  observaciones: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userRolPut = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRolPut))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const factura = await db.facturaProveedor.findUnique({ where: { id } });
  if (!factura) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (factura.estado === "PAGADA")
    return NextResponse.json({ error: "No se puede editar una factura pagada." }, { status: 409 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const updated = await db.facturaProveedor.update({
    where: { id },
    data: {
      ...data,
      ...(data.fechaEmision && { fechaEmision: new Date(data.fechaEmision + "T00:00:00") }),
      ...(data.fechaVencimiento !== undefined && {
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento + "T00:00:00") : null,
      }),
    },
    include: { proveedor: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json({ data: serialize(updated as unknown as Record<string, unknown>) });
}

// ─── DELETE /api/proveedores/facturas/[id] ────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userRolDel = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRolDel))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const factura = await db.facturaProveedor.findUnique({ where: { id } });
  if (!factura) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (factura.estado === "PAGADA")
    return NextResponse.json({ error: "No se puede eliminar una factura pagada." }, { status: 409 });

  await db.facturaProveedor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
