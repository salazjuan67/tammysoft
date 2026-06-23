import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import ResumenDineroDisponible from "@/components/dashboard/ResumenDineroDisponible";
import {
  ShoppingCart, DollarSign, AlertCircle, TrendingUp,
  Clock, AlertTriangle, ArrowRight, TrendingDown, Minus,
} from "lucide-react";

async function getDashboardStats() {
  const ahora = new Date();
  const hoyInicio = new Date(ahora); hoyInicio.setHours(0, 0, 0, 0);
  const hoyFin = new Date(ahora); hoyFin.setDate(hoyFin.getDate() + 1); hoyFin.setHours(0, 0, 0, 0);
  const mesInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const [
    pedidosHoy,
    pedidosPendientes,
    alertasNoLeidas,
    cobradoHoy,
    deudaTotal,
    facturasVencidas,
    ultimosPedidos,
    clientesTopHoy,
    vendidoHoy,
    gastadoHoyAgg,
    deudaProveedoresAgg,
  ] = await Promise.all([
    // Pedidos para hoy (fecha entrega)
    db.pedido.count({
      where: { fechaEntrega: { gte: hoyInicio, lt: hoyFin }, estado: { not: "CANCELADO" } },
    }),
    // Pendientes de producción
    db.pedido.count({ where: { estado: { in: ["PENDIENTE", "EN_PRODUCCION"] } } }),
    // Alertas sin leer
    db.alerta.count({ where: { leido: false } }),
    // Cobrado hoy (pagos registrados hoy)
    db.pago.aggregate({
      _sum: { monto: true },
      where: { fechaPago: { gte: hoyInicio, lt: hoyFin } },
    }),
    // Deuda total pendiente
    db.factura.aggregate({
      _sum: { montoTotal: true },
      where: { estado: { in: ["PENDIENTE", "PARCIALMENTE_COBRADA"] } },
    }),
    // Facturas vencidas (más de 30 días sin cobrar)
    db.factura.count({
      where: {
        estado: { in: ["PENDIENTE", "PARCIALMENTE_COBRADA"] },
        fecha: { lte: new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    // Últimos 8 pedidos
    db.pedido.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { cliente: { select: { nombre: true } } },
    }),
    // Top clientes del mes (por montoTotal pedidos)
    db.pedido.groupBy({
      by: ["clienteId"],
      _sum: { montoTotal: true },
      _count: { id: true },
      where: {
        createdAt: { gte: mesInicio },
        estado: { not: "CANCELADO" },
      },
      orderBy: { _sum: { montoTotal: "desc" } },
      take: 5,
    }),
    // Vendido hoy (pedidos entregados hoy)
    db.pedido.aggregate({
      _sum: { montoTotal: true },
      where: { fechaEntrega: { gte: hoyInicio, lt: hoyFin }, estado: "ENTREGADO" },
    }),
    // Gastado hoy (pagos a proveedores hoy)
    db.pagoProveedor.aggregate({
      _sum: { monto: true },
      where: { fechaPago: { gte: hoyInicio, lt: hoyFin } },
    }),
    // Deuda total a proveedores
    db.facturaProveedor.aggregate({
      _sum: { montoTotal: true },
      where: { estado: { not: "PAGADA" } },
    }),
  ]);

  // Resolver nombres de clientes top
  const clienteIds = clientesTopHoy.map((c) => c.clienteId);
  const clientes = await db.cliente.findMany({
    where: { id: { in: clienteIds } },
    select: { id: true, nombre: true },
  });
  const clienteMap = new Map(clientes.map((c) => [c.id, c.nombre]));

  // Antigüedad de la deuda más vieja
  const facturasMasVieja = await db.factura.findFirst({
    where: { estado: { in: ["PENDIENTE", "PARCIALMENTE_COBRADA"] } },
    orderBy: { fecha: "asc" },
    select: { fecha: true },
  });
  const diasDeudaMax = facturasMasVieja
    ? Math.floor((ahora.getTime() - new Date(facturasMasVieja.fecha).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    pedidosHoy,
    pedidosPendientes,
    alertasNoLeidas,
    cobradoHoy: Number(cobradoHoy._sum.monto ?? 0),
    vendidoHoy: Number(vendidoHoy._sum.montoTotal ?? 0),
    gastadoHoy: Number(gastadoHoyAgg._sum.monto ?? 0),
    netoHoy: Number(cobradoHoy._sum.monto ?? 0) - Number(gastadoHoyAgg._sum.monto ?? 0),
    deudaTotal: Number(deudaTotal._sum.montoTotal ?? 0),
    deudaProveedores: Number(deudaProveedoresAgg._sum.montoTotal ?? 0),
    facturasVencidas,
    diasDeudaMax,
    ultimosPedidos,
    clientesTop: clientesTopHoy.map((c) => ({
      clienteId: c.clienteId,
      nombre: clienteMap.get(c.clienteId) ?? "—",
      totalMes: Number(c._sum.montoTotal ?? 0),
      cantidadPedidos: c._count.id,
    })),
  };
}

const estadoBadge: Record<string, React.ReactNode> = {
  PENDIENTE: <Badge variant="warning">Pendiente</Badge>,
  EN_PRODUCCION: <Badge variant="info">En producción</Badge>,
  ENTREGADO: <Badge variant="success">Entregado</Badge>,
  CANCELADO: <Badge variant="secondary">Cancelado</Badge>,
};

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Resumen ejecutivo del día</p>
      </div>

      {/* Alertas críticas */}
      {(stats.facturasVencidas > 0 || stats.alertasNoLeidas > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats.facturasVencidas > 0 && (
            <Link href="/dashboard/facturacion?estado=sin-cobrar">
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors">
                <AlertTriangle className="h-4 w-4" />
                {stats.facturasVencidas} factura{stats.facturasVencidas > 1 ? "s" : ""} vencida{stats.facturasVencidas > 1 ? "s" : ""} (+30 días)
              </div>
            </Link>
          )}
          {stats.alertasNoLeidas > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-amber-700 text-sm font-medium">
              <AlertCircle className="h-4 w-4" />
              {stats.alertasNoLeidas} alerta{stats.alertasNoLeidas > 1 ? "s" : ""} sin leer
            </div>
          )}
        </div>
      )}

      {/* Cards principales */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Vendido hoy</CardTitle>
            <TrendingUp className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.vendidoHoy)}</p>
            <p className="text-xs text-gray-500 mt-1">pedidos entregados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pedidos hoy</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.pedidosHoy}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.pedidosPendientes} pendientes de entregar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cobrado hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.cobradoHoy)}</p>
            <p className="text-xs text-gray-500 mt-1">pagos registrados</p>
          </CardContent>
        </Card>

        <Card className="border-red-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Gastado hoy</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.gastadoHoy)}</p>
            <Link href="/dashboard/admin/proveedores/facturas" className="text-xs text-pink-600 hover:underline">
              Ver proveedores →
            </Link>
          </CardContent>
        </Card>

        <Card className={stats.netoHoy >= 0 ? "border-green-100" : "border-red-100"}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Neto hoy</CardTitle>
            <Minus className={`h-4 w-4 ${stats.netoHoy >= 0 ? "text-green-600" : "text-red-500"}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats.netoHoy >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(stats.netoHoy)}
            </p>
            <p className="text-xs text-gray-500 mt-1">cobrado − gastado</p>
          </CardContent>
        </Card>

        <Card className={stats.deudaProveedores > 0 ? "border-orange-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Deuda a proveedores</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats.deudaProveedores > 0 ? "text-orange-600" : "text-gray-900"}`}>
              {formatCurrency(stats.deudaProveedores)}
            </p>
            <Link href="/dashboard/admin/proveedores/facturas?estado=PENDIENTE" className="text-xs text-pink-600 hover:underline">
              Ver facturas →
            </Link>
          </CardContent>
        </Card>

        <Card className={stats.deudaTotal > 0 ? "border-orange-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Deuda de clientes</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.deudaTotal)}</p>
            <Link href="/dashboard/cobranza" className="text-xs text-pink-600 hover:underline">
              Ver cobranza →
            </Link>
          </CardContent>
        </Card>

        <Card className={stats.diasDeudaMax > 30 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Antigüedad deuda</CardTitle>
            <Clock className={`h-4 w-4 ${stats.diasDeudaMax > 30 ? "text-red-500" : "text-gray-400"}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${stats.diasDeudaMax > 30 ? "text-red-600" : "text-gray-900"}`}>
              {stats.diasDeudaMax}d
            </p>
            <p className="text-xs text-gray-500 mt-1">deuda más antigua</p>
          </CardContent>
        </Card>

        <Card className={stats.facturasVencidas > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Facturas vencidas</CardTitle>
            <AlertCircle className={`h-4 w-4 ${stats.facturasVencidas > 0 ? "text-red-500" : "text-gray-400"}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${stats.facturasVencidas > 0 ? "text-red-600" : "text-gray-900"}`}>
              {stats.facturasVencidas}
            </p>
            <p className="text-xs text-gray-500 mt-1">más de 30 días sin cobrar</p>
          </CardContent>
        </Card>
      </div>

      {/* Caja y Banco */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Dinero disponible (acumulado)</h2>
        <ResumenDineroDisponible compact autoRefresh />
      </div>

      {/* Bottom section: Últimos pedidos + Clientes top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos pedidos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Últimos pedidos</CardTitle>
            <Link href="/dashboard/pedidos" className="text-xs text-pink-600 hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {stats.ultimosPedidos.length === 0 ? (
              <p className="text-gray-500 text-sm py-6 text-center px-4">No hay pedidos aún</p>
            ) : (
              <div>
                {stats.ultimosPedidos.map((pedido) => (
                  <div
                    key={pedido.id}
                    className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-900">{pedido.cliente.nombre}</p>
                      <p className="text-xs text-gray-500">Entrega: {formatDate(pedido.fechaEntrega)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">
                        {formatCurrency(Number(pedido.montoTotal))}
                      </span>
                      {estadoBadge[pedido.estado]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clientes top del mes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Top clientes este mes</CardTitle>
            <Link href="/dashboard/reportes" className="text-xs text-pink-600 hover:underline flex items-center gap-1">
              Ver reportes <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {stats.clientesTop.length === 0 ? (
              <p className="text-gray-500 text-sm py-6 text-center px-4">Sin datos este mes</p>
            ) : (
              <div>
                {stats.clientesTop.map((c, i) => (
                  <div key={c.clienteId} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{c.nombre}</p>
                      <p className="text-xs text-gray-500">{c.cantidadPedidos} pedidos</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
                      {formatCurrency(c.totalMes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
