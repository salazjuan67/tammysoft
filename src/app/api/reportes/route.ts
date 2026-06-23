import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const MESES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo") ?? "ventas-mes";
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const dateFilter = {
    ...(desde && { gte: new Date(desde) }),
    ...(hasta && { lte: new Date(hasta) }),
  };

  // ─── VENTAS POR MES (últimos 12 meses, pedidos entregados) ─────────────────
  if (tipo === "ventas-mes") {
    const pedidos = await db.pedido.findMany({
      where: {
        estado: "ENTREGADO",
        fechaEntrega: Object.keys(dateFilter).length > 0 ? dateFilter : {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 11, 1)),
        },
      },
      select: { montoTotal: true, fechaEntrega: true },
      orderBy: { fechaEntrega: "asc" },
    });

    // Últimos 12 meses con 0 por defecto
    const porMes: Record<string, { mes: string; label: string; total: number; cantidadPedidos: number }> = {};
    const hoy = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      porMes[key] = { mes: key, label: `${MESES_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, total: 0, cantidadPedidos: 0 };
    }

    for (const p of pedidos) {
      const d = new Date(p.fechaEntrega);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (porMes[key]) {
        porMes[key].total += Number(p.montoTotal);
        porMes[key].cantidadPedidos += 1;
      }
    }

    return NextResponse.json({ data: Object.values(porMes) });
  }

  // ─── TOP PRODUCTOS MÁS VENDIDOS ────────────────────────────────────────────
  if (tipo === "productos-mas-vendidos") {
    const items = await db.pedidoItem.groupBy({
      by: ["productoId"],
      _sum: { cantidad: true, subtotal: true },
      orderBy: { _sum: { cantidad: "desc" } },
      take: 10,
      where: {
        pedido: {
          estado: { not: "CANCELADO" },
          ...(Object.keys(dateFilter).length > 0 && { fechaEntrega: dateFilter }),
        },
      },
    });

    const productosIds = items.map((i) => i.productoId);
    const productos = await db.producto.findMany({
      where: { id: { in: productosIds } },
      include: { categoria: { select: { nombre: true } } },
    });
    const prodMap = new Map(productos.map((p) => [p.id, p]));

    return NextResponse.json({
      data: items.map((item) => ({
        producto: prodMap.get(item.productoId),
        cantidadTotal: item._sum.cantidad ?? 0,
        ventaTotal: Number(item._sum.subtotal ?? 0),
      })).filter((i) => i.producto),
    });
  }

  // ─── TOP CLIENTES ──────────────────────────────────────────────────────────
  if (tipo === "clientes-principales") {
    const pedidos = await db.pedido.groupBy({
      by: ["clienteId"],
      _sum: { montoTotal: true },
      _count: { id: true },
      orderBy: { _sum: { montoTotal: "desc" } },
      take: 10,
      where: {
        estado: { not: "CANCELADO" },
        ...(Object.keys(dateFilter).length > 0 && { fechaEntrega: dateFilter }),
      },
    });

    const clienteIds = pedidos.map((p) => p.clienteId);
    const clientes = await db.cliente.findMany({ where: { id: { in: clienteIds } } });
    const clienteMap = new Map(clientes.map((c) => [c.id, c]));

    return NextResponse.json({
      data: pedidos.map((p) => ({
        cliente: clienteMap.get(p.clienteId),
        totalCompras: Number(p._sum.montoTotal ?? 0),
        cantidadPedidos: p._count.id,
      })).filter((d) => d.cliente),
    });
  }

  // ─── CARGA POR DÍA DE SEMANA ───────────────────────────────────────────────
  if (tipo === "carga-dia-semana") {
    const hace90 = new Date(); hace90.setDate(hace90.getDate() - 90);
    const items = await db.pedidoItem.findMany({
      where: {
        pedido: {
          estado: { not: "CANCELADO" },
          fechaEntrega: { gte: hace90 },
        },
      },
      include: { pedido: { select: { fechaEntrega: true } } },
    });

    const porDia: Record<number, { dia: string; items: number; pedidos: Set<string> }> = {};
    for (let i = 0; i < 7; i++) {
      porDia[i] = { dia: DIAS_ES[i], items: 0, pedidos: new Set() };
    }

    for (const item of items) {
      const diaSemana = new Date(item.pedido.fechaEntrega).getDay();
      porDia[diaSemana].items += item.cantidad;
      porDia[diaSemana].pedidos.add(item.pedidoId);
    }

    // Ordenar Lun→Dom
    const orden = [1, 2, 3, 4, 5, 6, 0];
    return NextResponse.json({
      data: orden.map((d) => ({
        dia: porDia[d].dia,
        items: porDia[d].items,
        pedidos: porDia[d].pedidos.size,
      })),
    });
  }

  // ─── CARGA POR RANGO HORARIO HOY ───────────────────────────────────────────
  if (tipo === "carga-horario-hoy") {
    const hoyInicio = new Date(); hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin = new Date(); hoyFin.setHours(23, 59, 59, 999);

    const pedidos = await db.pedido.findMany({
      where: {
        fechaEntrega: { gte: hoyInicio, lte: hoyFin },
        estado: { not: "CANCELADO" },
      },
      include: {
        items: { select: { cantidad: true } },
      },
    });

    const porRango: Record<string, { rango: string; items: number; pedidos: number }> = {};
    for (const p of pedidos) {
      const r = p.rangoHorario;
      if (!porRango[r]) porRango[r] = { rango: r, items: 0, pedidos: 0 };
      porRango[r].pedidos += 1;
      porRango[r].items += p.items.reduce((s, i) => s + i.cantidad, 0);
    }

    return NextResponse.json({ data: Object.values(porRango).sort((a, b) => a.rango.localeCompare(b.rango)) });
  }

  // ─── PEDIDOS POR RANGO HORARIO (histórico) ─────────────────────────────────
  if (tipo === "pedidos-rango-horario") {
    const pedidos = await db.pedido.groupBy({
      by: ["rangoHorario"],
      _count: { id: true },
      _sum: { montoTotal: true },
      where: {
        estado: { not: "CANCELADO" },
        ...(Object.keys(dateFilter).length > 0 && { fechaEntrega: dateFilter }),
      },
    });

    return NextResponse.json({ data: pedidos });
  }

  // ─── BAJA ROTACIÓN ─────────────────────────────────────────────────────────
  if (tipo === "productos-baja-rotacion") {
    const hace90 = new Date(); hace90.setDate(hace90.getDate() - 90);
    const items = await db.pedidoItem.groupBy({
      by: ["productoId"],
      _sum: { cantidad: true },
      orderBy: { _sum: { cantidad: "asc" } },
      take: 10,
      where: { pedido: { estado: { not: "CANCELADO" }, fechaEntrega: { gte: hace90 } } },
    });

    const productosIds = items.map((i) => i.productoId);
    const productos = await db.producto.findMany({
      where: { id: { in: productosIds }, activo: true },
      include: { categoria: { select: { nombre: true } } },
    });
    const prodMap = new Map(productos.map((p) => [p.id, p]));

    return NextResponse.json({
      data: items.map((item) => ({
        producto: prodMap.get(item.productoId),
        cantidadTotal: item._sum.cantidad ?? 0,
      })).filter((i) => i.producto),
    });
  }

  // ─── DEUDA ENVEJECIDA (por cliente con días) ───────────────────────────────
  if (tipo === "deuda-envejecida") {
    const ahora = new Date();
    const facturas = await db.factura.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIALMENTE_COBRADA"] } },
      include: {
        cliente: { select: { id: true, nombre: true } },
        pagos: { select: { monto: true } },
      },
      orderBy: { fecha: "asc" },
    });

    // Agrupar por cliente
    const porCliente: Record<string, {
      clienteId: string; nombre: string;
      deudaTotal: number; cantidadFacturas: number; diasMax: number;
      semaforo: "rojo" | "naranja" | "amarillo" | "verde";
    }> = {};

    for (const f of facturas) {
      const pagado = f.pagos.reduce((s, p) => s + Number(p.monto), 0);
      const saldo = Number(f.montoTotal) - pagado;
      if (saldo <= 0) continue;

      const dias = Math.floor((ahora.getTime() - new Date(f.fecha).getTime()) / (1000 * 60 * 60 * 24));
      const id = f.clienteId;

      if (!porCliente[id]) {
        porCliente[id] = { clienteId: id, nombre: f.cliente.nombre, deudaTotal: 0, cantidadFacturas: 0, diasMax: 0, semaforo: "verde" };
      }
      porCliente[id].deudaTotal += saldo;
      porCliente[id].cantidadFacturas += 1;
      porCliente[id].diasMax = Math.max(porCliente[id].diasMax, dias);
    }

    // Asignar semáforo
    const resultado = Object.values(porCliente).map((c) => ({
      ...c,
      semaforo: c.diasMax >= 60 ? "rojo" : c.diasMax >= 30 ? "naranja" : c.diasMax >= 15 ? "amarillo" : "verde" as const,
    })).sort((a, b) => b.deudaTotal - a.deudaTotal);

    return NextResponse.json({ data: resultado });
  }

  // ─── FLUJO DE CAJA (últimos 30 días) ──────────────────────────────────────
  if (tipo === "flujo-caja") {
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30);

    const [pagos, pedidosMes] = await Promise.all([
      db.pago.findMany({
        where: { fechaPago: { gte: hace30 } },
        select: { monto: true, tipoPago: true, fechaPago: true },
        orderBy: { fechaPago: "asc" },
      }),
      db.pago.aggregate({
        _sum: { monto: true },
        where: { tipoPago: "EFECTIVO" },
      }),
    ]);

    const [efectivoAgg, transferenciaAgg] = await Promise.all([
      db.pago.aggregate({ _sum: { monto: true }, where: { tipoPago: "EFECTIVO" } }),
      db.pago.aggregate({ _sum: { monto: true }, where: { tipoPago: "TRANSFERENCIA" } }),
    ]);

    // Agrupar por día
    const porDia: Record<string, { fecha: string; efectivo: number; transferencia: number; total: number }> = {};
    for (const p of pagos) {
      const key = new Date(p.fechaPago).toISOString().split("T")[0];
      if (!porDia[key]) porDia[key] = { fecha: key, efectivo: 0, transferencia: 0, total: 0 };
      const monto = Number(p.monto);
      if (p.tipoPago === "EFECTIVO") porDia[key].efectivo += monto;
      else porDia[key].transferencia += monto;
      porDia[key].total += monto;
    }

    void pedidosMes;

    return NextResponse.json({
      data: Object.values(porDia),
      resumen: {
        totalEfectivo: Number(efectivoAgg._sum.monto ?? 0),
        totalTransferencia: Number(transferenciaAgg._sum.monto ?? 0),
        total: Number(efectivoAgg._sum.monto ?? 0) + Number(transferenciaAgg._sum.monto ?? 0),
      },
    });
  }

  // ─── FLUJO DE CAJA CON EGRESOS (30 días) ──────────────────────────────────
  if (tipo === "flujo-caja-completo") {
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30);

    const [ingresos, egresos] = await Promise.all([
      db.pago.findMany({
        where: { fechaPago: { gte: hace30 } },
        select: { monto: true, fechaPago: true },
      }),
      db.pagoProveedor.findMany({
        where: { fechaPago: { gte: hace30 } },
        select: { monto: true, fechaPago: true },
      }),
    ]);

    const porDia: Record<string, { fecha: string; ingresos: number; egresos: number; neto: number }> = {};
    const ensureDia = (key: string) => {
      if (!porDia[key]) porDia[key] = { fecha: key, ingresos: 0, egresos: 0, neto: 0 };
    };

    for (const p of ingresos) {
      const key = new Date(p.fechaPago).toISOString().split("T")[0];
      ensureDia(key); porDia[key].ingresos += Number(p.monto);
    }
    for (const p of egresos) {
      const key = new Date(p.fechaPago).toISOString().split("T")[0];
      ensureDia(key); porDia[key].egresos += Number(p.monto);
    }
    for (const d of Object.values(porDia)) d.neto = d.ingresos - d.egresos;

    const totalIngresos = ingresos.reduce((s, p) => s + Number(p.monto), 0);
    const totalEgresos = egresos.reduce((s, p) => s + Number(p.monto), 0);

    return NextResponse.json({
      data: Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      resumen: { totalIngresos, totalEgresos, neto: totalIngresos - totalEgresos },
    });
  }

  // ─── GASTOS POR CATEGORÍA/CONCEPTO (últimos 30 días) ──────────────────────
  if (tipo === "gastos-por-concepto") {
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30);
    const facturas = await db.facturaProveedor.groupBy({
      by: ["concepto"],
      _sum: { montoTotal: true },
      _count: { id: true },
      where: { fechaEmision: { gte: hace30 } },
      orderBy: { _sum: { montoTotal: "desc" } },
    });

    return NextResponse.json({
      data: facturas.map(f => ({
        concepto: f.concepto,
        total: Number(f._sum.montoTotal ?? 0),
        cantidad: f._count.id,
      })),
    });
  }

  // ─── DEUDA A PROVEEDORES POR PROVEEDOR ────────────────────────────────────
  if (tipo === "deuda-proveedores") {
    const facturas = await db.facturaProveedor.findMany({
      where: { estado: { not: "PAGADA" } },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        pagos: { select: { monto: true } },
      },
    });

    const ahora = new Date();
    const porProveedor: Record<string, { proveedorId: string; nombre: string; pendiente: number; vencidas: number; cantidadFacturas: number }> = {};

    for (const f of facturas) {
      const pagado = f.pagos.reduce((s, p) => s + Number(p.monto), 0);
      const saldo = Math.max(0, Number(f.montoTotal) - pagado);
      if (saldo <= 0) continue;

      const id = f.proveedorId;
      if (!porProveedor[id]) porProveedor[id] = { proveedorId: id, nombre: f.proveedor.nombre, pendiente: 0, vencidas: 0, cantidadFacturas: 0 };
      porProveedor[id].pendiente += saldo;
      porProveedor[id].cantidadFacturas += 1;
      if (f.fechaVencimiento && new Date(f.fechaVencimiento) < ahora) {
        porProveedor[id].vencidas += saldo;
      }
    }

    return NextResponse.json({
      data: Object.values(porProveedor).sort((a, b) => b.pendiente - a.pendiente),
    });
  }

  return NextResponse.json({ error: "Tipo de reporte inválido" }, { status: 400 });
}
