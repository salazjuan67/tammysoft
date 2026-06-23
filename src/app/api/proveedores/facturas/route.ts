import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  proveedorId: z.string().min(1),
  numeroFactura: z.string().min(1),
  fechaEmision: z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha inválida"),
  fechaVencimiento: z.string().optional().nullable(),
  montoNeto: z.number().min(0),
  montoIva: z.number().min(0),
  montoTotal: z.number().min(0),
  concepto: z.string().min(1),
  observaciones: z.string().optional().nullable(),
});

// ─── GET /api/proveedores/facturas ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const proveedorId = searchParams.get("proveedorId") ?? "";
  const estado = searchParams.get("estado") ?? "";
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  const where: Record<string, unknown> = {};
  if (proveedorId) where.proveedorId = proveedorId;
  if (estado) where.estado = estado;
  if (desde || hasta) {
    where.fechaEmision = {
      ...(desde && { gte: new Date(desde + "T00:00:00") }),
      ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
    };
  }

  const [facturas, total] = await Promise.all([
    db.facturaProveedor.findMany({
      where,
      include: {
        proveedor: { select: { id: true, nombre: true } },
        pagos: { select: { monto: true } },
      },
      orderBy: { fechaEmision: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.facturaProveedor.count({ where }),
  ]);

  // Mark overdue invoices dynamically and calculate saldo
  const hoy = new Date();
  const data = facturas.map(({ pagos, ...f }) => {
    const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0);
    const saldoPendiente = Math.max(0, Number(f.montoTotal) - totalPagado);
    const vencida =
      f.estado !== "PAGADA" &&
      f.fechaVencimiento != null &&
      new Date(f.fechaVencimiento) < hoy;
    return {
      ...f,
      montoNeto: Number(f.montoNeto),
      montoIva: Number(f.montoIva),
      montoTotal: Number(f.montoTotal),
      saldoPendiente,
      estadoMostrar: vencida ? "VENCIDA" : f.estado,
    };
  });

  return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

// ─── POST /api/proveedores/facturas ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userRolPost = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRolPost))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { proveedorId, numeroFactura, fechaEmision, fechaVencimiento, montoNeto, montoIva, montoTotal, concepto, observaciones } = parsed.data;

  const factura = await db.facturaProveedor.create({
    data: {
      proveedorId,
      numeroFactura,
      fechaEmision: new Date(fechaEmision + "T00:00:00"),
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento + "T00:00:00") : null,
      montoNeto,
      montoIva,
      montoTotal,
      concepto,
      observaciones,
    },
    include: { proveedor: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json({ data: { ...factura, montoNeto: Number(factura.montoNeto), montoIva: Number(factura.montoIva), montoTotal: Number(factura.montoTotal) } }, { status: 201 });
}
