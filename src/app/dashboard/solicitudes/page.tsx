"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";

interface SolicitudItem {
  id: string;
  pedidoId: string;
  pedidoMontoTotal: number;
  pedidoNotas: string | null;
  porcentajeFacturado: number;
  montoEfectivo: number;
  montoBase: number;
  montoIva: number;
  montoTransfer: number;
  pedido: { id: string; fechaEntrega: string; notas: string | null; montoTotal: number };
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
  cliente: { id: string; nombre: string };
  items: SolicitudItem[];
}

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("PENDIENTE");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<{ id: string; accion: "procesar" | "rechazar" } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/solicitudes-facturacion?estado=${filtroEstado}`);
    const json = await res.json();
    setSolicitudes(json.data ?? []);
    setLoading(false);
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  async function ejecutarAccion(id: string, accion: "procesar" | "rechazar") {
    setProcesando(id);
    const res = await fetch(`/api/solicitudes-facturacion/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    });
    const json = await res.json();
    setProcesando(null);
    setConfirmar(null);
    if (res.ok) {
      toast({ title: json.message });
      cargar();
    } else {
      toast({ title: "Error", description: json.error, variant: "destructive" });
    }
  }

  const estadoBadge: Record<string, React.ReactNode> = {
    PENDIENTE: <Badge variant="warning">En revisión</Badge>,
    PROCESADA: <Badge variant="success">Procesada</Badge>,
    RECHAZADA: <Badge variant="destructive">Rechazada</Badge>,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Facturación</h1>
          <p className="text-gray-500 text-sm">Solicitudes enviadas por los distribuidores</p>
        </div>
      </div>

      {/* Filtro estado */}
      <div className="flex gap-2">
        {["PENDIENTE", "PROCESADA", "RECHAZADA", "todas"].map((e) => (
          <Button
            key={e}
            size="sm"
            variant={filtroEstado === e ? "default" : "outline"}
            onClick={() => setFiltroEstado(e)}
          >
            {e === "PENDIENTE" ? "Pendientes" : e === "PROCESADA" ? "Procesadas" : e === "RECHAZADA" ? "Rechazadas" : "Todas"}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Cargando...</div>
      ) : solicitudes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No hay solicitudes {filtroEstado !== "todas" ? filtroEstado.toLowerCase() + "s" : ""}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {solicitudes.map((sol) => (
            <Card key={sol.id} className={sol.estado === "PENDIENTE" ? "border-amber-200" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">Solicitud #{sol.numero}</CardTitle>
                      {estadoBadge[sol.estado]}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      <span className="font-medium">{sol.cliente.nombre}</span>
                      {" · "}{formatDate(sol.createdAt)}
                      {" · "}{sol.items.length} pedido{sol.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Acciones */}
                  {sol.estado === "PENDIENTE" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setConfirmar({ id: sol.id, accion: "rechazar" })}>
                        <X className="h-3.5 w-3.5" /> Rechazar
                      </Button>
                      <Button size="sm" onClick={() => setConfirmar({ id: sol.id, accion: "procesar" })}>
                        <Check className="h-3.5 w-3.5" /> Procesar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Resumen montos */}
                <div className="grid grid-cols-4 gap-3 mt-3 bg-gray-50 rounded-xl p-3 text-xs text-center">
                  <div>
                    <p className="text-gray-400">💵 Efectivo</p>
                    <p className="font-semibold text-gray-700">{formatCurrency(sol.montoEfectivo)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">📄 Base factura</p>
                    <p className="font-semibold">{formatCurrency(sol.montoBase)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">🧾 IVA {Math.round(sol.tasaIva * 100)}%</p>
                    <p className="font-semibold text-blue-600">{formatCurrency(sol.montoIva)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">💳 Total factura</p>
                    <p className="font-bold text-pink-600">{formatCurrency(sol.montoTransfer)}</p>
                  </div>
                </div>
              </CardHeader>

              {/* Detalle pedidos */}
              <CardContent className="pt-0">
                <button
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                  onClick={() => setExpanded(expanded === sol.id ? null : sol.id)}
                >
                  {expanded === sol.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Ver detalle de pedidos
                </button>

                {expanded === sol.id && (
                  <div className="mt-3 space-y-2">
                    {sol.items.map((item) => (
                      <div key={item.id} className="border border-gray-100 rounded-xl p-3 text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800">
                              Entrega: {formatDate(item.pedido.fechaEntrega)}
                            </p>
                            {item.pedidoNotas && (
                              <p className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 inline-block">
                                📝 {item.pedidoNotas}
                              </p>
                            )}
                          </div>
                          <p className="font-semibold">{formatCurrency(item.pedidoMontoTotal)}</p>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-center bg-gray-50 rounded-lg p-2">
                          <div>
                            <p className="text-gray-400">Facturar</p>
                            <p className="font-semibold">{Math.round(item.porcentajeFacturado * 100)}%</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Efectivo</p>
                            <p className="font-semibold">{formatCurrency(item.montoEfectivo)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">IVA</p>
                            <p className="font-semibold text-blue-600">{formatCurrency(item.montoIva)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Factura</p>
                            <p className="font-semibold text-pink-600">{formatCurrency(item.montoTransfer)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de confirmación */}
      <Dialog open={!!confirmar} onOpenChange={() => setConfirmar(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmar?.accion === "procesar" ? "¿Procesar solicitud?" : "¿Rechazar solicitud?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {confirmar?.accion === "procesar"
              ? "Se actualizarán las facturas con el monto a facturar + IVA, y se registrará el efectivo como pago. Esta acción no se puede deshacer."
              : "La solicitud quedará como rechazada y los pedidos volverán a estar disponibles."}
          </p>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="outline" onClick={() => setConfirmar(null)}>Cancelar</Button>
            <Button
              variant={confirmar?.accion === "rechazar" ? "destructive" : "default"}
              disabled={!!procesando}
              onClick={() => confirmar && ejecutarAccion(confirmar.id, confirmar.accion)}
            >
              {procesando ? "Procesando..." : confirmar?.accion === "procesar" ? "Sí, procesar" : "Sí, rechazar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
