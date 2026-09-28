import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { productoSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const categoriaId = searchParams.get("categoriaId") ?? "";
  const soloActivos = searchParams.get("activos") !== "false";
  // Permitir pasar clienteId explícito (desde admin al crear pedido para un cliente)
  const clienteIdParam = searchParams.get("clienteId") ?? "";

  const productos = await db.producto.findMany({
    where: {
      ...(soloActivos && { activo: true }),
      ...(categoriaId && { categoriaId }),
      ...(search && { nombre: { contains: search, mode: "insensitive" } }),
    },
    include: { categoria: true },
    orderBy: [{ categoria: { orden: "asc" } }, { nombre: "asc" }],
  });

  // Resolver el clienteId para buscar descuentos:
  // Si el usuario es CLIENTE, usar su clienteId asociado; si se pasa clienteId explícito, usarlo.
  const rol = (session.user as { rol: string }).rol;
  const sessionClienteId = (session.user as { clienteId?: string }).clienteId ?? "";
  const clienteIdFinal = clienteIdParam || (rol === "CLIENTE" ? sessionClienteId : "");

  if (clienteIdFinal) {
    // Buscar tipo del cliente y sus descuentos
    const cliente = await db.cliente.findUnique({
      where: { id: clienteIdFinal },
      select: {
        tipoClienteId: true,
        tipoCliente: {
          select: {
            descuentos: { select: { productoId: true, descuento: true } },
          },
        },
      },
    });

    if (cliente?.tipoCliente?.descuentos?.length) {
      const mapaDescuentos = new Map(
        cliente.tipoCliente.descuentos.map((d) => [d.productoId, Number(d.descuento)])
      );
      const productosConDescuento = productos.map((p) => {
        const desc = mapaDescuentos.get(p.id) ?? 0;
        if (desc <= 0) return p;
        const precioOriginal = Number(p.precio);
        const precioConDescuento = precioOriginal * (1 - desc);
        return { ...p, precio: precioConDescuento, descuento: desc, precioOriginal };
      });
      return NextResponse.json({ data: productosConDescuento });
    }
  }

  return NextResponse.json({ data: productos });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rol = (session.user as { rol: string }).rol;
  if (rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores pueden crear productos" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = productoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const producto = await db.producto.create({ data: parsed.data });
  return NextResponse.json({ data: producto }, { status: 201 });
}
