import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ShoppingCart, DollarSign, Calendar, Plus, ArrowRight } from "lucide-react";

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700",
  EN_PRODUCCION: "bg-blue-100 text-blue-700",
  ENTREGADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PRODUCCION: "En producción",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export default async function ClienteDashboard() {
  const session = await auth();
  const clienteId = (session?.user as { clienteId?: string })?.clienteId;
  if (!clienteId) redirect("/cliente/login");

  const ahora = new Date();

  const [pedidosActivos, deudaTotal, proximaEntrega, ultimosPedidos] = await Promise.all([
    db.pedido.count({ where: { clienteId, estado: { in: ["PENDIENTE", "EN_PRODUCCION"] } } }),
    db.factura.aggregate({
      _sum: { montoTotal: true },
      where: { clienteId, estado: { in: ["PENDIENTE", "PARCIALMENTE_COBRADA"] } },
    }),
    db.pedido.findFirst({
      where: { clienteId, estado: { in: ["PENDIENTE", "EN_PRODUCCION"] }, fechaEntrega: { gte: ahora } },
      orderBy: { fechaEntrega: "asc" },
      select: { fechaEntrega: true, rangoHorario: true },
    }),
    db.pedido.findMany({
      where: { clienteId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, montoTotal: true, fechaEntrega: true, estado: true, createdAt: true },
    }),
  ]);

  const deuda = Number(deudaTotal._sum.montoTotal ?? 0);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, {session?.user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">Bienvenido a tu portal de pedidos</p>
        </div>
        <Link
          href="/cliente/pedidos/nuevo"
          className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nuevo pedido
        </Link>
      </div>

      {/* 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Pedidos activos</span>
            <div className="w-9 h-9 bg-pink-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-pink-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{pedidosActivos}</p>
          <Link href="/cliente/pedidos" className="text-xs text-pink-600 hover:underline mt-1 block">Ver todos →</Link>
        </div>

        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${deuda > 0 ? "border-orange-200" : "border-pink-100"}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Mi deuda</span>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${deuda > 0 ? "bg-orange-100" : "bg-green-100"}`}>
              <DollarSign className={`h-4 w-4 ${deuda > 0 ? "text-orange-600" : "text-green-600"}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${deuda > 0 ? "text-orange-600" : "text-green-600"}`}>
            {deuda > 0 ? formatCurrency(deuda) : "Sin deuda"}
          </p>
          <Link href="/cliente/deuda" className="text-xs text-pink-600 hover:underline mt-1 block">Ver detalle →</Link>
        </div>

        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Próxima entrega</span>
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          {proximaEntrega ? (
            <>
              <p className="text-xl font-bold text-gray-900">{formatDate(proximaEntrega.fechaEntrega)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {proximaEntrega.rangoHorario !== "SIN_ESPECIFICAR"
                  ? proximaEntrega.rangoHorario.replace("H", "").replace("_", "–") + " hs"
                  : "Horario no especificado"}
              </p>
            </>
          ) : (
            <p className="text-gray-400 text-sm">Sin pedidos pendientes</p>
          )}
        </div>
      </div>

      {/* Últimos pedidos */}
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Últimos pedidos</h2>
          <Link href="/cliente/pedidos" className="text-xs text-pink-600 hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {ultimosPedidos.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm mb-3">Todavía no hiciste ningún pedido</p>
            <Link href="/cliente/pedidos/nuevo" className="text-pink-600 text-sm font-medium hover:underline">
              + Hacer tu primer pedido
            </Link>
          </div>
        ) : (
          <div>
            {ultimosPedidos.map((p) => (
              <Link
                key={p.id}
                href={`/cliente/pedidos/${p.id}`}
                className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-pink-50/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">Pedido #{p.id.slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-gray-400">Entrega: {formatDate(p.fechaEntrega)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(Number(p.montoTotal))}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_BADGE[p.estado]}`}>
                    {ESTADO_LABEL[p.estado]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
