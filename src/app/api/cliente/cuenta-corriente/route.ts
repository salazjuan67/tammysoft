import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (userRol !== "CLIENTE") return NextResponse.json({ error: "Solo distribuidores" }, { status: 403 });

  // Obtener el cliente asociado al usuario
  const cliente = await db.cliente.findFirst({
    where: { usuario: { id: session.user.id } },
  });
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  // Pedidos entregados
  const pedidos = await db.pedido.findMany({
    where: { clienteId: cliente.id, estado: "ENTREGADO" },
    select: { id: true, fechaEntrega: true, montoTotal: true, notas: true, createdAt: true },
    orderBy: { fechaEntrega: "desc" },
  });

  // Facturas pendientes (saldo por cobrar)
  const facturas = await db.factura.findMany({
    where: {
      clienteId: cliente.id,
      estado: { in: ["PENDIENTE", "PARCIALMENTE_COBRADA"] },
    },
    include: {
      pagos: { select: { monto: true } },
    },
  });

  const totalPedidos = pedidos.reduce((s, p) => s + Number(p.montoTotal), 0);
  const totalDeuda = facturas.reduce((s, f) => {
    const pagado = f.pagos.reduce((ps, p) => ps + Number(p.monto), 0);
    return s + Math.max(0, Number(f.montoTotal) - pagado);
  }, 0);

  // Solicitudes
  const solicitudes = await db.solicitudFacturacion.findMany({
    where: { clienteId: cliente.id },
    include: { items: { include: { pedido: { select: { fechaEntrega: true, notas: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // IDs de pedidos ya incluidos en alguna solicitud
  const pedidosEnSolicitud = await db.solicitudItem.findMany({
    where: { pedido: { clienteId: cliente.id } },
    select: { pedidoId: true },
  });
  const pedidosEnSolicitudIds = new Set(pedidosEnSolicitud.map((s) => s.pedidoId));

  // Pedidos disponibles para nueva solicitud (entregados, no en solicitud aún)
  const pedidosDisponibles = pedidos.filter((p) => !pedidosEnSolicitudIds.has(p.id));

  return NextResponse.json({
    data: {
      clienteId: cliente.id,
      totalPedidos,
      totalDeuda,
      pedidosDisponibles,
      solicitudes: solicitudes.map((s) => ({
        ...s,
        montoEfectivo: Number(s.montoEfectivo),
        montoBase: Number(s.montoBase),
        montoIva: Number(s.montoIva),
        montoTransfer: Number(s.montoTransfer),
        montoTotal: Number(s.montoTotal),
        tasaIva: Number(s.tasaIva),
        items: s.items.map((i) => ({
          ...i,
          pedidoMontoTotal: Number(i.pedidoMontoTotal),
          porcentajeFacturado: Number(i.porcentajeFacturado),
          montoEfectivo: Number(i.montoEfectivo),
          montoBase: Number(i.montoBase),
          montoIva: Number(i.montoIva),
          montoTransfer: Number(i.montoTransfer),
        })),
      })),
    },
  });
}
