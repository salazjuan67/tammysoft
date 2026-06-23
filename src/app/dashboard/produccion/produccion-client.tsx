"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, getRangoLabel, formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";
import { Printer, Bell, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ProductoItem {
  id: string;
  productoId: string;
  cantidad: number;
  producto: {
    id: string;
    nombre: string;
    categoriaId: string;
    categoria: { id: string; nombre: string };
  };
}

interface PedidoProduccion {
  id: string;
  estado: string;
  rangoHorario: string;
  cliente: { id: string; nombre: string };
  items: ProductoItem[];
}

interface ProduccionClientProps {
  pedidosIniciales: PedidoProduccion[];
  alertasNoLeidas: number;
  fechaInicial: string;
}

// Numeric sort order for time ranges (earliest to latest)
const RANGO_ORDER: Record<string, number> = {
  H5_6: 1, H7_8: 2, H9_10: 3, H10_12: 4,
  H12_14: 5, H14_16: 6, H16_18: 7, SIN_ESPECIFICAR: 99,
};
function sortPedidos(arr: PedidoProduccion[]) {
  return [...arr].sort((a, b) => {
    const diff = (RANGO_ORDER[a.rangoHorario] ?? 50) - (RANGO_ORDER[b.rangoHorario] ?? 50);
    if (diff !== 0) return diff;
    return a.cliente.nombre.localeCompare(b.cliente.nombre);
  });
}

export function ProduccionClient({ pedidosIniciales, alertasNoLeidas: alertasIniciales, fechaInicial }: ProduccionClientProps) {
  const [fecha, setFecha] = useState(new Date(fechaInicial).toISOString().split("T")[0]);
  const [pedidos, setPedidos] = useState(() => sortPedidos(pedidosIniciales));
  const [alertas, setAlertas] = useState(alertasIniciales);
  const [loading, setLoading] = useState(false);
  const [vistaAgrupacion, setVistaAgrupacion] = useState<"horario" | "categoria">("horario");
  const printRef = useRef<HTMLDivElement>(null);

  // IVA modal state
  const [ivaModalPedido, setIvaModalPedido] = useState<{ id: string; monto: number } | null>(null);
  const [ivaSeleccionado, setIvaSeleccionado] = useState<0 | 0.21>(0);
  const [entregando, setEntregando] = useState(false);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  // Cargar pedidos al cambiar fecha
  async function cargarPedidos(fechaStr: string) {
    setLoading(true);
    try {
      const inicio = new Date(fechaStr);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fechaStr);
      fin.setHours(23, 59, 59, 999);

      const [resPend, resEnProd] = await Promise.all([
        fetch(`/api/pedidos?desde=${inicio.toISOString()}&hasta=${fin.toISOString()}&estado=PENDIENTE&pageSize=100&includeItems=true`),
        fetch(`/api/pedidos?desde=${inicio.toISOString()}&hasta=${fin.toISOString()}&estado=EN_PRODUCCION&pageSize=100&includeItems=true`),
      ]);
      const [jsonPend, jsonEnProd] = await Promise.all([resPend.json(), resEnProd.json()]);
      const combined = [...(jsonPend.data ?? []), ...(jsonEnProd.data ?? [])];
      setPedidos(sortPedidos(combined));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargarPedidos(fecha); }, [fecha]);

  // Supabase Realtime — alertas en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel("alertas-produccion")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alertas" },
        (payload) => {
          setAlertas((prev) => prev + 1);
          toast({
            title: "⚠️ Nuevo pedido fuera de horario",
            description: payload.new.mensaje as string,
            variant: "destructive",
          });
          // Notificación del navegador si está habilitado
          if (Notification.permission === "granted") {
            new Notification("Postres Tammy — Nuevo pedido", {
              body: payload.new.mensaje as string,
              icon: "/favicon.ico",
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function cambiarEstadoPedido(pedidoId: string, estado: string, tasaIva?: number) {
    const res = await fetch(`/api/pedidos/${pedidoId}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, ...(tasaIva !== undefined && { tasaIva }) }),
    });
    if (res.ok) {
      cargarPedidos(fecha);
      toast({ title: "Estado actualizado" });
    } else {
      toast({ title: "Error al actualizar estado", variant: "destructive" });
    }
  }

  function solicitarEntrega(pedido: PedidoProduccion) {
    setIvaSeleccionado(0);
    setIvaModalPedido({ id: pedido.id, monto: 0 }); // monto shown in modal title
  }

  async function confirmarEntrega() {
    if (!ivaModalPedido) return;
    setEntregando(true);
    await cambiarEstadoPedido(ivaModalPedido.id, "ENTREGADO", ivaSeleccionado);
    setEntregando(false);
    setIvaModalPedido(null);
  }

  async function marcarAlertasLeidas() {
    await fetch("/api/alertas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marcarTodas: true }),
    });
    setAlertas(0);
    toast({ title: "Alertas marcadas como leídas" });
  }

  // Agrupar por horario
  const pedidosPorHorario = pedidos.reduce<Record<string, PedidoProduccion[]>>((acc, p) => {
    const key = p.rangoHorario;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Agrupar todos los items por categoría
  const itemsPorCategoria: Record<string, { nombre: string; items: { productoNombre: string; cantidadTotal: number }[] }> = {};
  pedidos.forEach((p) => {
    (p.items ?? []).forEach((item) => {
      const catId = item.producto.categoriaId;
      const catNombre = item.producto.categoria.nombre;
      if (!itemsPorCategoria[catId]) itemsPorCategoria[catId] = { nombre: catNombre, items: [] };
      const existing = itemsPorCategoria[catId].items.find((i) => i.productoNombre === item.producto.nombre);
      if (existing) {
        existing.cantidadTotal += item.cantidad;
      } else {
        itemsPorCategoria[catId].items.push({ productoNombre: item.producto.nombre, cantidadTotal: item.cantidad });
      }
    });
  });

  // Ordenar alfabéticamente los items dentro de cada categoría
  Object.values(itemsPorCategoria).forEach((cat) => {
    cat.items.sort((a, b) => a.productoNombre.localeCompare(b.productoNombre));
  });

  const navFecha = (dias: number) => {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    setFecha(d.toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Producción</h1>
          <p className="text-gray-500 text-sm">{pedidos.length} pedidos para {formatDate(fecha)}</p>
        </div>
        <div className="flex items-center gap-2">
          {alertas > 0 && (
            <Button variant="warning" size="sm" onClick={marcarAlertasLeidas}>
              <Bell className="h-4 w-4" />
              {alertas} alertas
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => cargarPedidos(fecha)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePrint()}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Navegación de fecha */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navFecha(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-44"
            />
            <Button variant="outline" size="icon" onClick={() => navFecha(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                variant={vistaAgrupacion === "horario" ? "default" : "outline"}
                onClick={() => setVistaAgrupacion("horario")}
              >
                Por horario
              </Button>
              <Button
                size="sm"
                variant={vistaAgrupacion === "categoria" ? "default" : "outline"}
                onClick={() => setVistaAgrupacion("categoria")}
              >
                Por categoría
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido imprimible */}
      <div ref={printRef}>
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">Comanda — {formatDate(fecha)}</h1>
          <p className="text-gray-600">Postres Tammy Light</p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Cargando comanda...</div>
        ) : pedidos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 font-medium">No hay pedidos para esta fecha</p>
            </CardContent>
          </Card>
        ) : vistaAgrupacion === "horario" ? (
          // Vista por rango horario
          <div className="space-y-4">
            {Object.entries(pedidosPorHorario)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([rango, pedidosRango]) => (
                <Card key={rango}>
                  <CardHeader className="pb-3 bg-pink-50 rounded-t-xl">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{getRangoLabel(rango)}</span>
                      <Badge>{pedidosRango.length} pedidos</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {pedidosRango.map((pedido) => (
                        <div key={pedido.id} className="border border-gray-100 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-900">{pedido.cliente.nombre}</p>
                            <div className="flex items-center gap-2 no-print">
                              {pedido.estado === "PENDIENTE" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => cambiarEstadoPedido(pedido.id, "EN_PRODUCCION")}
                                >
                                  Iniciar
                                </Button>
                              )}
                              {pedido.estado === "EN_PRODUCCION" && (
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => solicitarEntrega(pedido)}
                                >
                                  Entregar
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                            {pedido.items
                              .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre))
                              .map((item) => (
                                <div key={item.id} className="flex items-center gap-2 text-sm">
                                  <span className="font-bold text-pink-600 w-6">{item.cantidad}</span>
                                  <span className="text-gray-700">{item.producto.nombre}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          // Vista por categoría (totales para producción)
          <div className="space-y-4">
            {Object.entries(itemsPorCategoria)
              .sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre))
              .map(([catId, categoria]) => (
                <Card key={catId}>
                  <CardHeader className="pb-3 bg-blue-50 rounded-t-xl">
                    <CardTitle className="text-base">{categoria.nombre}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categoria.items.map((item) => (
                        <div
                          key={item.productoNombre}
                          className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                        >
                          <span className="text-sm text-gray-700">{item.productoNombre}</span>
                          <span className="font-bold text-lg text-pink-600 ml-2">{item.cantidadTotal}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Modal IVA al entregar */}
      <Dialog open={!!ivaModalPedido} onOpenChange={(open) => { if (!open) setIvaModalPedido(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar entrega — ¿incluye IVA?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-600">
              Seleccioná si esta factura lleva IVA o no. Esto afecta cómo se muestra el desglose en cobranza.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIvaSeleccionado(0)}
                className={`rounded-xl border-2 px-4 py-3 text-center transition-colors ${
                  ivaSeleccionado === 0
                    ? "border-pink-600 bg-pink-50 text-pink-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <p className="font-bold text-lg">Sin IVA</p>
                <p className="text-xs mt-0.5">Precio final incluye todo</p>
              </button>
              <button
                type="button"
                onClick={() => setIvaSeleccionado(0.21)}
                className={`rounded-xl border-2 px-4 py-3 text-center transition-colors ${
                  ivaSeleccionado === 0.21
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <p className="font-bold text-lg">IVA 21%</p>
                <p className="text-xs mt-0.5">Se desglosa neto + IVA</p>
              </button>
            </div>

            {ivaSeleccionado === 0.21 && (
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">La factura se generará con desglose:</p>
                <p>Neto (sin IVA 21%) + IVA 21% = Total del pedido</p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setIvaModalPedido(null)}>
                Cancelar
              </Button>
              <Button onClick={confirmarEntrega} disabled={entregando}>
                {entregando ? "Procesando..." : "Confirmar entrega"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
