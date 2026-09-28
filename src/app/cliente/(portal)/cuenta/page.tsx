"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Minus } from "lucide-react";
import { useRouter } from "next/navigation";

interface PedidoDisponible {
  id: string;
  fechaEntrega: string;
  montoTotal: number;
  notas: string | null;
}

interface SolicitudItem {
  pedidoId: string;
  pedidoMontoTotal: number;
  pedidoNotas: string | null;
  porcentajeFacturado: number;
  montoEfectivo: number;
  montoBase: number;
  montoIva: number;
  montoTransfer: number;
}

interface Solicitud {
  id: string;
  numero: number;
  estado: string;
  montoEfectivo: number;
  montoBase: number;
  montoIva: number;
  montoTransfer: number;
  montoTotal: number;
  tasaIva: number;
  notas: string | null;
  createdAt: string;
  items: SolicitudItem[];
}

interface CuentaData {
  clienteId: string;
  totalPedidos: number;
  totalDeuda: number;
  pedidosDisponibles: PedidoDisponible[];
  solicitudes: Solicitud[];
}

const IVA_RATE = 0.21;

export default function MiCuentaPage() {
  const router = useRouter();
  const [data, setData] = useState<CuentaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creandoSolicitud, setCreandoSolicitud] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [expandedSolicitud, setExpandedSolicitud] = useState<string | null>(null);

  // Estado de la nueva solicitud
  const [seleccionados, setSeleccionados] = useState<Record<string, { checked: boolean; porcentaje: number }>>({});

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const res = await fetch("/api/cliente/cuenta-corriente");
    const json = await res.json();
    if (res.ok) setData(json.data);
    setLoading(false);
  }

  function togglePedido(pedidoId: string) {
    setSeleccionados((prev) => {
      if (prev[pedidoId]) {
        const next = { ...prev };
        delete next[pedidoId];
        return next;
      }
      return { ...prev, [pedidoId]: { checked: true, porcentaje: 100 } };
    });
  }

  function setPorcentaje(pedidoId: string, value: number) {
    setSeleccionados((prev) => ({ ...prev, [pedidoId]: { ...prev[pedidoId], porcentaje: Math.min(100, Math.max(0, value)) } }));
  }

  // Calcular resumen de la nueva solicitud
  const pedidosSeleccionados = Object.entries(seleccionados).map(([pedidoId, cfg]) => {
    const pedido = data?.pedidosDisponibles.find((p) => p.id === pedidoId);
    if (!pedido) return null;
    const pct = cfg.porcentaje / 100;
    const montoBase = pedido.montoTotal * pct;
    const montoEfectivo = pedido.montoTotal * (1 - pct);
    const montoIva = montoBase * IVA_RATE;
    const montoTransfer = montoBase + montoIva;
    return { pedido, pct, montoBase, montoEfectivo, montoIva, montoTransfer };
  }).filter(Boolean) as { pedido: PedidoDisponible; pct: number; montoBase: number; montoEfectivo: number; montoIva: number; montoTransfer: number }[];

  const resumenTotal = pedidosSeleccionados.reduce(
    (acc, p) => ({
      efectivo: acc.efectivo + p.montoEfectivo,
      base: acc.base + p.montoBase,
      iva: acc.iva + p.montoIva,
      transfer: acc.transfer + p.montoTransfer,
    }),
    { efectivo: 0, base: 0, iva: 0, transfer: 0 }
  );

  async function enviarSolicitud() {
    if (pedidosSeleccionados.length === 0) {
      toast({ title: "Seleccioná al menos un pedido", variant: "destructive" }); return;
    }
    setEnviando(true);
    const items = pedidosSeleccionados.map((p) => ({
      pedidoId: p.pedido.id,
      pedidoMontoTotal: p.pedido.montoTotal,
      pedidoNotas: p.pedido.notas,
      porcentajeFacturado: p.pct,
    }));
    const res = await fetch("/api/cliente/solicitudes-facturacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, tasaIva: IVA_RATE }),
    });
    const json = await res.json();
    setEnviando(false);
    if (res.ok) {
      toast({ title: "Solicitud enviada correctamente ✓" });
      setCreandoSolicitud(false);
      setSeleccionados({});
      cargar();
    } else {
      toast({ title: "Error", description: json.error, variant: "destructive" });
    }
  }

  const estadoColor: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-700",
    PROCESADA: "bg-green-100 text-green-700",
    RECHAZADA: "bg-red-100 text-red-700",
  };

  if (loading) return <div className="py-20 text-center text-gray-400">Cargando cuenta...</div>;
  if (!data) return <div className="py-20 text-center text-gray-400">No se pudo cargar la cuenta.</div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-4 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-pink-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mi Cuenta Corriente</h1>
          <p className="text-xs text-gray-400">Historial de pedidos y facturación</p>
        </div>
      </div>

      {/* Resumen saldo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total pedidos entregados</p>
          <p className="text-2xl font-bold text-pink-600">{formatCurrency(data.totalPedidos)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Saldo pendiente de pago</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(data.totalDeuda)}</p>
        </div>
      </div>

      {/* Botón nueva solicitud */}
      {data.pedidosDisponibles.length > 0 && (
        <div>
          {!creandoSolicitud ? (
            <button
              onClick={() => setCreandoSolicitud(true)}
              className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-5 rounded-2xl text-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Solicitar facturación de pedidos
            </button>
          ) : (
            <div className="bg-white border border-pink-100 rounded-2xl shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Nueva solicitud de facturación</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Seleccioná los pedidos y qué porcentaje querés facturar (con IVA 21%). El resto va en efectivo sin factura.
                </p>
              </div>

              <div className="divide-y divide-gray-50">
                {data.pedidosDisponibles.map((pedido) => {
                  const sel = seleccionados[pedido.id];
                  const isSelected = !!sel;
                  const pct = sel?.porcentaje ?? 100;
                  const montoBase = pedido.montoTotal * (pct / 100);
                  const montoEfectivo = pedido.montoTotal - montoBase;
                  const montoIva = montoBase * IVA_RATE;

                  return (
                    <div key={pedido.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePedido(pedido.id)}
                          className="mt-1 h-4 w-4 accent-pink-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm text-gray-900">
                              {formatDate(pedido.fechaEntrega)}
                              {pedido.notas && <span className="ml-2 text-amber-600 text-xs">· {pedido.notas}</span>}
                            </p>
                            <p className="font-bold text-gray-900 text-sm">{formatCurrency(pedido.montoTotal)}</p>
                          </div>

                          {isSelected && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-28 shrink-0">% a facturar (c/IVA):</span>
                                <button onClick={() => setPorcentaje(pedido.id, pct - 10)} className="p-1 rounded hover:bg-gray-100"><Minus className="h-3 w-3" /></button>
                                <input
                                  type="number" min="0" max="100" step="5"
                                  value={pct}
                                  onChange={(e) => setPorcentaje(pedido.id, Number(e.target.value))}
                                  className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm"
                                />
                                <span className="text-xs text-gray-500">%</span>
                                <button onClick={() => setPorcentaje(pedido.id, pct + 10)} className="p-1 rounded hover:bg-gray-100"><Plus className="h-3 w-3" /></button>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs bg-gray-50 rounded-lg p-2">
                                <div className="text-center">
                                  <p className="text-gray-400">Efectivo</p>
                                  <p className="font-semibold text-gray-700">{formatCurrency(montoEfectivo)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-400">Base + IVA 21%</p>
                                  <p className="font-semibold text-blue-600">{formatCurrency(montoBase)} + {formatCurrency(montoIva)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-400">Factura total</p>
                                  <p className="font-semibold text-pink-600">{formatCurrency(montoBase + montoIva)}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumen total */}
              {pedidosSeleccionados.length > 0 && (
                <div className="mx-4 mb-4 bg-pink-50 border border-pink-100 rounded-xl p-3 text-sm space-y-1">
                  <p className="font-semibold text-gray-700 mb-2">Resumen de la solicitud</p>
                  <div className="flex justify-between text-gray-600">
                    <span>💵 Efectivo (sin factura)</span>
                    <span className="font-medium">{formatCurrency(resumenTotal.efectivo)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>📄 Base a facturar</span>
                    <span className="font-medium">{formatCurrency(resumenTotal.base)}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>🧾 IVA 21%</span>
                    <span className="font-medium">{formatCurrency(resumenTotal.iva)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-pink-200 pt-1 mt-1">
                    <span>Total factura (transferencia)</span>
                    <span className="text-pink-600">{formatCurrency(resumenTotal.transfer)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 px-4 pb-4">
                <button
                  onClick={() => { setCreandoSolicitud(false); setSeleccionados({}); }}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={enviarSolicitud}
                  disabled={enviando || pedidosSeleccionados.length === 0}
                  className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  {enviando ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historial de solicitudes */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm">Solicitudes enviadas</h2>
        {data.solicitudes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No hay solicitudes aún</p>
        ) : data.solicitudes.map((sol) => (
          <div key={sol.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => setExpandedSolicitud(expandedSolicitud === sol.id ? null : sol.id)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Solicitud #{sol.numero}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColor[sol.estado] ?? "bg-gray-100 text-gray-600"}`}>
                    {sol.estado === "PENDIENTE" ? "En revisión" : sol.estado === "PROCESADA" ? "Procesada" : "Rechazada"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(sol.createdAt)} · {sol.items.length} pedidos</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Total</p>
                <p className="font-bold text-pink-600">{formatCurrency(sol.montoTotal)}</p>
                {expandedSolicitud === sol.id ? <ChevronUp className="h-4 w-4 text-gray-400 ml-auto mt-1" /> : <ChevronDown className="h-4 w-4 text-gray-400 ml-auto mt-1" />}
              </div>
            </div>

            {expandedSolicitud === sol.id && (
              <div className="border-t border-gray-50 px-4 pb-4 space-y-3 pt-3">
                <div className="grid grid-cols-3 gap-2 text-xs text-center bg-gray-50 rounded-xl p-3">
                  <div><p className="text-gray-400">Efectivo</p><p className="font-semibold">{formatCurrency(sol.montoEfectivo)}</p></div>
                  <div><p className="text-gray-400">IVA 21%</p><p className="font-semibold text-blue-600">{formatCurrency(sol.montoIva)}</p></div>
                  <div><p className="text-gray-400">Factura</p><p className="font-semibold text-pink-600">{formatCurrency(sol.montoTransfer)}</p></div>
                </div>
                {sol.items.map((item) => (
                  <div key={item.pedidoId} className="text-sm border border-gray-100 rounded-xl p-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pedido {item.pedidoNotas && `· ${item.pedidoNotas}`}</span>
                      <span className="font-medium">{formatCurrency(item.pedidoMontoTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Facturar {Math.round(item.porcentajeFacturado * 100)}%</span>
                      <span>Efectivo {formatCurrency(item.montoEfectivo)} | Factura {formatCurrency(item.montoTransfer)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
