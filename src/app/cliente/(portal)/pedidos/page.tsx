"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Eye, Pencil, XCircle, Copy, Loader2 } from "lucide-react";

interface PedidoRow {
  id: string;
  montoTotal: number;
  fechaEntrega: string;
  createdAt: string;
  estado: string;
  items: { productoId: string; cantidad: number; precioUnitario: number; producto: { nombre: string } }[];
  factura?: { id: string; estado: string } | null;
}

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700",
  EN_PRODUCCION: "bg-blue-100 text-blue-700",
  ENTREGADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-400",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PRODUCCION: "En producción",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const FILTROS_ESTADO = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "EN_PRODUCCION", label: "En producción" },
  { value: "ENTREGADO", label: "Entregados" },
  { value: "CANCELADO", label: "Cancelados" },
];

export default function MisPedidosPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [repitiendo, setRepitiendo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const qs = new URLSearchParams();
    if (filtroEstado) qs.set("estado", filtroEstado);
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    const res = await fetch(`/api/cliente/pedidos?${qs.toString()}`);
    const json = await res.json();
    setPedidos(json.data ?? []);
    setCargando(false);
  }, [filtroEstado, desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  async function cancelar(id: string) {
    if (!confirm("¿Cancelar este pedido?")) return;
    setCancelando(id);
    const res = await fetch(`/api/cliente/pedidos/${id}`, { method: "DELETE" });
    if (res.ok) { cargar(); }
    else { const j = await res.json(); alert(j.error); }
    setCancelando(null);
  }

  async function repetir(id: string) {
    setRepitiendo(id);
    try {
      const res = await fetch(`/api/cliente/pedidos/${id}`);
      const json = await res.json();
      if (!res.ok || !json.data) { alert("No se pudo cargar el pedido."); return; }

      const pedido = json.data;
      // Build cart from existing items
      const carrito = (pedido.items ?? []).map((item: { productoId: string; cantidad: number; precioUnitario: number; producto: { nombre: string } }) => ({
        productoId: item.productoId,
        nombre: item.producto?.nombre ?? item.productoId,
        precio: Number(item.precioUnitario),
        cantidad: item.cantidad,
      }));

      // Store in sessionStorage so the new-order page picks it up
      sessionStorage.setItem("tammy_carrito_inicial", JSON.stringify(carrito));
      router.push("/cliente/pedidos/nuevo");
    } finally {
      setRepitiendo(null);
    }
  }

  function limpiarFiltros() {
    setFiltroEstado("");
    setDesde("");
    setHasta("");
  }

  const hayFiltros = filtroEstado || desde || hasta;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mis Pedidos</h1>
        <Link
          href="/cliente/pedidos/nuevo"
          className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo pedido
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-4 space-y-3">
        {/* Estado pills */}
        <div className="flex gap-2 flex-wrap">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroEstado(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filtroEstado === f.value
                  ? "bg-pink-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Fecha */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Entrega desde</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
          {hayFiltros && (
            <button onClick={limpiarFiltros} className="text-xs text-pink-600 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
        {cargando ? (
          <p className="text-gray-400 text-sm text-center py-12">Cargando...</p>
        ) : pedidos.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm mb-3">No tenés pedidos{hayFiltros ? " con estos filtros" : ""}</p>
            <Link href="/cliente/pedidos/nuevo" className="text-pink-600 text-sm font-medium hover:underline">
              + Hacer un pedido
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase bg-gray-50/50">
                  <th className="text-left px-4 py-3"># Pedido</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Creado</th>
                  <th className="text-left px-4 py-3">Entrega</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-center px-4 py-3">Estado</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-pink-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">#{p.id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(p.fechaEntrega)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(Number(p.montoTotal))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_BADGE[p.estado]}`}>
                        {ESTADO_LABEL[p.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        {/* Ver */}
                        <button
                          onClick={() => router.push(`/cliente/pedidos/${p.id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Repetir (siempre disponible) */}
                        <button
                          onClick={() => repetir(p.id)}
                          disabled={repitiendo === p.id}
                          className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Repetir pedido"
                        >
                          {repitiendo === p.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Copy className="h-4 w-4" />
                          }
                        </button>

                        {/* Editar (solo si PENDIENTE) */}
                        {p.estado === "PENDIENTE" && (
                          <button
                            onClick={() => router.push(`/cliente/pedidos/${p.id}/editar`)}
                            className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                            title="Editar pedido"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}

                        {/* Cancelar (solo si PENDIENTE) */}
                        {p.estado === "PENDIENTE" && (
                          <button
                            onClick={() => cancelar(p.id)}
                            disabled={cancelando === p.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            title="Cancelar pedido"
                          >
                            {cancelando === p.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <XCircle className="h-4 w-4" />
                            }
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
