import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function startOfDay(fecha: string) {
  return new Date(`${fecha}T00:00:00`);
}
function endOfDay(fecha: string) {
  return new Date(`${fecha}T23:59:59.999`);
}

type ItemAgg = { producto: string; categoria: string; cantidad: number };

function sumarItems(
  mapa: Map<string, ItemAgg>,
  items: Array<{ cantidad: number; producto: { nombre: string; categoria: { nombre: string } } }>
) {
  for (const item of items) {
    const key = item.producto.nombre;
    const actual = mapa.get(key);
    if (actual) actual.cantidad += item.cantidad;
    else mapa.set(key, {
      producto: item.producto.nombre,
      categoria: item.producto.categoria.nombre,
      cantidad: item.cantidad,
    });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(rol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const fecha = req.nextUrl.searchParams.get("fecha") ?? new Date().toISOString().split("T")[0];
  const desde = startOfDay(fecha);
  const hasta = endOfDay(fecha);

  const pedidos = await db.pedido.findMany({
    where: {
      estado: { not: "CANCELADO" },
      OR: [
        { fechaEntrega: { gte: desde, lte: hasta } },
        { fechaProduccion: { gte: desde, lte: hasta } },
      ],
    },
    include: {
      cliente: { select: { id: true, nombre: true } },
      items: {
        include: { producto: { include: { categoria: { select: { nombre: true } } } } },
        orderBy: { producto: { nombre: "asc" } },
      },
    },
    orderBy: [{ cliente: { nombre: "asc" } }, { fechaEntrega: "asc" }],
  });

  const hechosMap = new Map<string, ItemAgg>();
  const enProdMap = new Map<string, ItemAgg>();
  const pendientesMap = new Map<string, ItemAgg>();

  const clientesMap = new Map<string, {
    clienteId: string;
    nombre: string;
    pedidos: Array<{
      id: string;
      notas: string | null;
      estado: string;
      rangoHorario: string;
      fechaEntrega: Date;
      totalPostres: number;
      montoTotal: number;
      items: Array<{ nombre: string; cantidad: number; categoria: string }>;
    }>;
    totalPostres: number;
    postresHechos: number;
    postresEnProduccion: number;
    postresPendientes: number;
    montoTotal: number;
  }>();

  let postresHechos = 0;
  let postresEnProduccion = 0;
  let postresPendientes = 0;
  let montoTotal = 0;

  for (const pedido of pedidos) {
    const totalPostres = pedido.items.reduce((s, i) => s + i.cantidad, 0);
    const monto = Number(pedido.montoTotal);
    montoTotal += monto;

    if (pedido.estado === "ENTREGADO") {
      postresHechos += totalPostres;
      sumarItems(hechosMap, pedido.items);
    } else if (pedido.estado === "EN_PRODUCCION") {
      postresEnProduccion += totalPostres;
      sumarItems(enProdMap, pedido.items);
    } else {
      postresPendientes += totalPostres;
      sumarItems(pendientesMap, pedido.items);
    }

    const existente = clientesMap.get(pedido.clienteId);
    const pedidoRow = {
      id: pedido.id,
      notas: pedido.notas,
      estado: pedido.estado,
      rangoHorario: pedido.rangoHorario,
      fechaEntrega: pedido.fechaEntrega,
      totalPostres,
      montoTotal: monto,
      items: pedido.items.map((i) => ({
        nombre: i.producto.nombre,
        cantidad: i.cantidad,
        categoria: i.producto.categoria.nombre,
      })),
    };

    if (!existente) {
      clientesMap.set(pedido.clienteId, {
        clienteId: pedido.clienteId,
        nombre: pedido.cliente.nombre,
        pedidos: [pedidoRow],
        totalPostres,
        postresHechos: pedido.estado === "ENTREGADO" ? totalPostres : 0,
        postresEnProduccion: pedido.estado === "EN_PRODUCCION" ? totalPostres : 0,
        postresPendientes: pedido.estado === "PENDIENTE" ? totalPostres : 0,
        montoTotal: monto,
      });
    } else {
      existente.pedidos.push(pedidoRow);
      existente.totalPostres += totalPostres;
      existente.montoTotal += monto;
      if (pedido.estado === "ENTREGADO") existente.postresHechos += totalPostres;
      else if (pedido.estado === "EN_PRODUCCION") existente.postresEnProduccion += totalPostres;
      else existente.postresPendientes += totalPostres;
    }
  }

  const sortAgg = (a: ItemAgg, b: ItemAgg) =>
    a.categoria.localeCompare(b.categoria, "es") || a.producto.localeCompare(b.producto, "es");

  return NextResponse.json({
    data: {
      fecha,
      resumen: {
        pedidos: pedidos.length,
        clientes: clientesMap.size,
        postresTotal: postresHechos + postresEnProduccion + postresPendientes,
        postresHechos,
        postresEnProduccion,
        postresPendientes,
        montoTotal,
      },
      clientes: [...clientesMap.values()],
      postresHechos: [...hechosMap.values()].sort(sortAgg),
      postresEnProduccion: [...enProdMap.values()].sort(sortAgg),
      postresPendientes: [...pendientesMap.values()].sort(sortAgg),
    },
  });
}
