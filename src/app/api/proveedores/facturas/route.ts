import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { entradaStockCompra, resolverMateriaPrima } from "@/lib/stock";

const itemSchema = z.object({
  descripcion: z.string().min(1),
  cantidad: z.coerce.number().positive(),
  unidad: z.string().min(1).default("UN"),
  precioUnitario: z.coerce.number().min(0).default(0),
  subtotal: z.coerce.number().min(0).default(0),
});

const createSchema = z.object({
  proveedorId: z.string().min(1),
  numeroFactura: z.string().min(1),
  fechaEmision: z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha inválida"),
  fechaVencimiento: z.string().optional().nullable(),
  montoNeto: z.coerce.number().min(0),
  montoIva: z.coerce.number().min(0),
  montoTotal: z.coerce.number().min(0),
  concepto: z.string().min(1),
  observaciones: z.string().optional().nullable(),
  items: z.array(itemSchema).optional().default([]),
  actualizarStock: z.coerce.boolean().optional().default(true),
});

async function parseCreateBody(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const payloadRaw = form.get("payload");
    if (typeof payloadRaw !== "string") throw new Error("Falta payload");
    const payload = JSON.parse(payloadRaw);
    const imagen = form.get("imagen");
    return { payload, imagen: imagen instanceof File ? imagen : null };
  }
  const payload = await req.json();
  return { payload, imagen: null as File | null };
}

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
      select: {
        id: true,
        numeroFactura: true,
        proveedorId: true,
        fechaEmision: true,
        fechaVencimiento: true,
        montoNeto: true,
        montoIva: true,
        montoTotal: true,
        concepto: true,
        estado: true,
        observaciones: true,
        imagenMime: true,
        createdAt: true,
        updatedAt: true,
        proveedor: { select: { id: true, nombre: true } },
        pagos: { select: { monto: true } },
        _count: { select: { items: true } },
      },
      orderBy: { fechaEmision: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.facturaProveedor.count({ where }),
  ]);

  const hoy = new Date();
  const data = facturas.map(({ pagos, _count, imagenMime, ...f }) => {
    const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0);
    const saldoPendiente = Math.max(0, Number(f.montoTotal) - totalPagado);
    const vencida =
      f.estado !== "PAGADA" &&
      f.fechaVencimiento != null &&
      new Date(f.fechaVencimiento) < hoy;
    return {
      ...f,
      imagenMime,
      tieneImagen: !!imagenMime,
      cantidadItems: _count.items,
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

  let parsedBody: { payload: unknown; imagen: File | null };
  try {
    parsedBody = await parseCreateBody(req);
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(parsedBody.payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const {
    proveedorId,
    numeroFactura,
    fechaEmision,
    fechaVencimiento,
    montoNeto,
    montoIva,
    montoTotal,
    concepto,
    observaciones,
    items,
    actualizarStock,
  } = parsed.data;

  let imagenMime: string | null = null;
  let imagenData: Uint8Array | null = null;
  if (parsedBody.imagen) {
    if (parsedBody.imagen.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no puede superar 8 MB" }, { status: 400 });
    }
    imagenMime = parsedBody.imagen.type || "image/jpeg";
    imagenData = new Uint8Array(await parsedBody.imagen.arrayBuffer());
  }

  const factura = await db.$transaction(async (tx) => {
    const creada = await tx.facturaProveedor.create({
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
        ...(imagenData
          ? {
              imagenMime,
              // Prisma Bytes + TS 5.x: Buffer/Uint8Array genérico necesita cast
              imagenData: Buffer.from(imagenData) as unknown as Uint8Array<ArrayBuffer>,
            }
          : {}),
      },
      include: { proveedor: { select: { id: true, nombre: true } } },
    });

    await tx.proveedor.update({
      where: { id: proveedorId },
      data: { deudaActual: { increment: montoTotal } },
    });

    for (const item of items) {
      const subtotal =
        item.subtotal > 0
          ? item.subtotal
          : Math.round(item.cantidad * item.precioUnitario * 100) / 100;

      let materiaPrimaId: string | null = null;
      if (actualizarStock) {
        const mp = await resolverMateriaPrima(tx, item.descripcion, item.unidad);
        materiaPrimaId = mp.id;
        await entradaStockCompra(tx, {
          materiaPrimaId: mp.id,
          cantidad: item.cantidad,
          facturaProveedorId: creada.id,
          usuarioId: session.user.id,
          observaciones: `Compra factura ${numeroFactura}`,
        });
      }

      await tx.facturaProveedorItem.create({
        data: {
          facturaId: creada.id,
          materiaPrimaId,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precioUnitario: item.precioUnitario,
          subtotal,
        },
      });
    }

    return creada;
  });

  return NextResponse.json(
    {
      data: {
        ...factura,
        imagenData: undefined,
        montoNeto: Number(factura.montoNeto),
        montoIva: Number(factura.montoIva),
        montoTotal: Number(factura.montoTotal),
        cantidadItems: items.length,
      },
    },
    { status: 201 }
  );
}
