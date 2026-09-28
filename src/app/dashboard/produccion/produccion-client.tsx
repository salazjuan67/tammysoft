"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  notas: string | null;
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
  const [vistaAgrupacion, setVistaAgrupacion] = useState<"horario" | "categoria" | "cliente">("horario");
  const printRef = useRef<HTMLDivElement>(null);

  // Modal "Listo en heladera"
  const [heladeraModal, setHeladeraModal] = useState<{ pedidoId: string; clienteId: string; clienteNombre: string } | null>(null);
  const [numeroHeladera, setNumeroHeladera] = useState("");
  const [estante, setEstante] = useState("");
  const [horarioEntrega, setHorarioEntrega] = useState("");
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
      const desdeIso = inicio.toISOString();
      const hastaIso = fin.toISOString();

      // Buscamos en paralelo:
      // 1. PENDIENTE por fecha de entrega
      // 2. EN_PRODUCCION por fecha de ENTREGA (sin fechaProduccion asignada)
      // 3. EN_PRODUCCION por fecha de PRODUCCION (con fechaProduccion asignada)
      const [resPend, resEnProdEntrega, resEnProdProd] = await Promise.all([
        fetch(`/api/pedidos?desde=${desdeIso}&hasta=${hastaIso}&estado=PENDIENTE&pageSize=200&includeItems=true`),
        fetch(`/api/pedidos?desde=${desdeIso}&hasta=${hastaIso}&estado=EN_PRODUCCION&pageSize=200&includeItems=true`),
        fetch(`/api/pedidos?desdeProduccion=${fechaStr}&hastaProduccion=${fechaStr}&estado=EN_PRODUCCION&pageSize=200&includeItems=true`),
      ]);
      const [jsonPend, jsonEnProdEntrega, jsonEnProdProd] = await Promise.all([
        resPend.json(), resEnProdEntrega.json(), resEnProdProd.json(),
      ]);

      // Combinar y deduplicar por id
      const mapa = new Map<string, PedidoProduccion>();
      for (const p of [
        ...(jsonPend.data ?? []),
        ...(jsonEnProdEntrega.data ?? []),
        ...(jsonEnProdProd.data ?? []),
      ]) {
        mapa.set(p.id, p);
      }
      setPedidos(sortPedidos(Array.from(mapa.values())));
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

  async function cambiarEstadoPedido(pedidoId: string, estado: string, extra?: Record<string, unknown>) {
    const res = await fetch(`/api/pedidos/${pedidoId}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, tasaIva: 0, ...extra }),
    });
    if (res.ok) {
      cargarPedidos(fecha);
      toast({ title: "Estado actualizado" });
    } else {
      toast({ title: "Error al actualizar estado", variant: "destructive" });
    }
  }

  function abrirHeladeraModal(pedido: PedidoProduccion) {
    setNumeroHeladera("");
    setEstante("");
    setHorarioEntrega("");
    setHeladeraModal({ pedidoId: pedido.id, clienteId: pedido.cliente.id, clienteNombre: pedido.cliente.nombre });
  }

  async function confirmarListoEnHeladera() {
    if (!heladeraModal) return;
    setEntregando(true);
    await cambiarEstadoPedido(heladeraModal.pedidoId, "ENTREGADO", {
      ...(numeroHeladera && { numeroHeladera }),
      ...(estante && { estante }),
      ...(horarioEntrega && { horarioEntrega }),
    });
    setEntregando(false);
    setHeladeraModal(null);
  }

  // Imprimir pedidos de un cliente (o un pedido individual) en ventana emergente
  function imprimirPedidosCliente(pedidosImprimir: PedidoProduccion[], clienteNombre: string) {
    const rows = pedidosImprimir.map(p => `
      <div style="margin-bottom:12px; border:1px solid #eee; border-radius:6px; padding:10px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <strong>${p.cliente.nombre}</strong>
          <span style="color:#888; font-size:12px;">${getRangoLabel(p.rangoHorario)}</span>
        </div>
        <div style="display:grid; grid-template-columns: repeat(3,1fr); gap:4px;">
          ${p.items.sort((a,b) => a.producto.nombre.localeCompare(b.producto.nombre)).map(item =>
            `<div><strong style="color:#db2777">${item.cantidad}</strong> ${item.producto.nombre}</div>`
          ).join("")}
        </div>
      </div>`).join("");

    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Comanda — ${clienteNombre}</title>
      <style>
        body { font-family: sans-serif; font-size: 12px; margin: 10mm; }
        @media print { @page { size: A4; margin: 10mm; } }
      </style>
    </head><body>
      <h2 style="color:#db2777; margin-bottom:4px;">Postres Tammy Light</h2>
      <p style="color:#666; margin-bottom:12px; font-size:12px;">
        ${clienteNombre} — ${formatDate(fecha)}
      </p>
      ${rows}
      <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
    </body></html>`;

    const win = window.open("", "_blank", "width=800,height=600");
    if (win) { win.document.write(html); win.document.close(); }
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

  // Agrupar por cliente
  const pedidosPorCliente = pedidos.reduce<Record<string, { nombre: string; pedidos: PedidoProduccion[] }>>((acc, p) => {
    const key = p.cliente.id;
    if (!acc[key]) acc[key] = { nombre: p.cliente.nombre, pedidos: [] };
    acc[key].pedidos.push(p);
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

  Object.values(itemsPorCategoria).forEach((cat) => {
    cat.items.sort((a, b) => a.productoNombre.localeCompare(b.productoNombre));
  });

  const navFecha = (dias: number) => {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    setFecha(d.toISOString().split("T")[0]);
  };

  // Bloque de pedido reutilizable
  function PedidoCard({ pedido }: { pedido: PedidoProduccion }) {
    return (
      <div className="border border-gray-100 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-semibold text-gray-900">{pedido.cliente.nombre}</p>
            {pedido.notas && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-0.5 inline-block">
                📝 {pedido.notas}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{getRangoLabel(pedido.rangoHorario)}</p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <Badge variant={pedido.estado === "EN_PRODUCCION" ? "info" : "warning"} className="text-xs">
              {pedido.estado === "EN_PRODUCCION" ? "En producción" : "Pendiente"}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-gray-400 hover:text-gray-700"
              title="Imprimir este pedido"
              onClick={() => imprimirPedidosCliente([pedido], pedido.cliente.nombre)}
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>
            {pedido.estado === "PENDIENTE" && (
              <Button size="sm" variant="outline" onClick={() => cambiarEstadoPedido(pedido.id, "EN_PRODUCCION")}>
                Iniciar
              </Button>
            )}
            {pedido.estado === "EN_PRODUCCION" && (
              <Button size="sm" variant="success" onClick={() => abrirHeladeraModal(pedido)}>
                Listo en heladera
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {pedido.items
            .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre))
            .map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className="font-bold text-pink-600 w-6 shrink-0">{item.cantidad}</span>
                <span className="text-gray-700">{item.producto.nombre}</span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
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
      <Card className="no-print">
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
              {(["horario", "cliente", "categoria"] as const).map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant={vistaAgrupacion === v ? "default" : "outline"}
                  onClick={() => setVistaAgrupacion(v)}
                >
                  {v === "horario" ? "Por horario" : v === "cliente" ? "Por cliente" : "Por categoría"}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido imprimible */}
      <div ref={printRef}>
        {/* Encabezado solo en impresión */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">Comanda — {formatDate(fecha)}</h1>
          <p className="text-gray-600 text-sm">Postres Tammy Light · {pedidos.length} pedidos</p>
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
          <div className="space-y-4 print:space-y-2">
            {Object.entries(pedidosPorHorario)
              .sort(([a], [b]) => (RANGO_ORDER[a] ?? 50) - (RANGO_ORDER[b] ?? 50))
              .map(([rango, pedidosRango]) => (
                <Card key={rango} className="print:shadow-none print:border print:border-gray-300">
                  <CardHeader className="pb-3 bg-pink-50 rounded-t-xl print:py-2 print:bg-white print:border-b print:border-gray-300">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{getRangoLabel(rango)}</span>
                      <div className="flex items-center gap-2">
                        <Badge>{pedidosRango.length} pedidos</Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-gray-500 hover:text-gray-900 no-print"
                          title={`Imprimir horario ${getRangoLabel(rango)}`}
                          onClick={() => imprimirPedidosCliente(pedidosRango, getRangoLabel(rango))}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 print:pt-2">
                    <div className="space-y-4 print:space-y-2">
                      {pedidosRango.map((pedido) => <PedidoCard key={pedido.id} pedido={pedido} />)}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : vistaAgrupacion === "cliente" ? (
          <div className="space-y-4 print:space-y-2">
            {Object.entries(pedidosPorCliente)
              .sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre))
              .map(([clienteId, grupo]) => (
                <Card key={clienteId} className="print:shadow-none print:border print:border-gray-300">
                  <CardHeader className="pb-3 bg-blue-50 rounded-t-xl print:py-2 print:bg-white print:border-b print:border-gray-300">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{grupo.nombre}</span>
                      <div className="flex items-center gap-2">
                        <Badge>{grupo.pedidos.length} pedido{grupo.pedidos.length !== 1 ? "s" : ""}</Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-gray-500 hover:text-gray-900 no-print"
                          title={`Imprimir pedidos de ${grupo.nombre}`}
                          onClick={() => imprimirPedidosCliente(grupo.pedidos, grupo.nombre)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 print:pt-2">
                    <div className="space-y-4 print:space-y-2">
                      {grupo.pedidos.map((pedido) => <PedidoCard key={pedido.id} pedido={pedido} />)}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          // Vista por categoría (totales para producción)
          <div className="space-y-4 print:space-y-2">
            {Object.entries(itemsPorCategoria)
              .sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre))
              .map(([catId, categoria]) => (
                <Card key={catId} className="print:shadow-none print:border print:border-gray-300">
                  <CardHeader className="pb-3 bg-blue-50 rounded-t-xl print:py-2 print:bg-white print:border-b print:border-gray-300">
                    <CardTitle className="text-base">{categoria.nombre}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 print:pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-4 gap-2 print:gap-1">
                      {categoria.items.map((item) => (
                        <div
                          key={item.productoNombre}
                          className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 print:bg-white print:border print:border-gray-200 print:rounded print:px-2 print:py-1"
                        >
                          <span className="text-sm text-gray-700 print:text-xs">{item.productoNombre}</span>
                          <span className="font-bold text-lg text-pink-600 ml-2 print:text-sm">{item.cantidadTotal}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Modal Listo en heladera */}
      <Dialog open={!!heladeraModal} onOpenChange={(open) => { if (!open) setHeladeraModal(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Listo en heladera — {heladeraModal?.clienteNombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-gray-500">Campos opcionales. Completá lo que corresponda.</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">N° Heladera</Label>
                <Input
                  placeholder="ej. 2"
                  value={numeroHeladera}
                  onChange={(e) => setNumeroHeladera(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estante</Label>
                <Input
                  placeholder="ej. Superior"
                  value={estante}
                  onChange={(e) => setEstante(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Horario de entrega del cliente (se guarda para este cliente)</Label>
              <Input
                placeholder="ej. 10:00 - 12:00"
                value={horarioEntrega}
                onChange={(e) => setHorarioEntrega(e.target.value)}
              />
              <p className="text-xs text-gray-400">Si lo completás, se actualiza en la ficha del cliente.</p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setHeladeraModal(null)}>Cancelar</Button>
              <Button onClick={confirmarListoEnHeladera} disabled={entregando} variant="success">
                {entregando ? "Procesando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Estilos de impresión A4 */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { font-size: 10px !important; }
          .no-print { display: none !important; }
          nav, header, aside { display: none !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
