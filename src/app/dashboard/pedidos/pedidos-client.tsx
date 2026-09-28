"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate, getRangoLabel, puedeEditarPedido } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, X, Printer } from "lucide-react";
import { FormularioPedido } from "@/components/forms/formulario-pedido";
import { useReactToPrint } from "react-to-print";
import type { Cliente, Categoria, Producto } from "@/types";

interface CategoriaConProductos extends Categoria {
  productos: Producto[];
}

interface PedidoResumen {
  id: string;
  cliente: { id: string; nombre: string };
  fechaEntrega: string;
  rangoHorario: string;
  estado: string;
  montoTotal: number;
  notas: string | null;
  createdAt: string;
  _count: { items: number };
}

interface ItemDetalle {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  producto: { nombre: string; categoria: { nombre: string } };
}

interface PedidoDetalle extends Omit<PedidoResumen, "_count"> {
  items: ItemDetalle[];
  notas: string | null;
}

interface PedidosClientProps {
  clientes: Cliente[];
  categorias: CategoriaConProductos[];
  userRol: string;
  userId: string;
}

const ESTADOS_DISPONIBLES = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_PRODUCCION", label: "En producción" },
  { value: "ENTREGADO", label: "Entregado" },
  { value: "CANCELADO", label: "Cancelado" },
];

const estadoBadge: Record<string, React.ReactNode> = {
  PENDIENTE: <Badge variant="warning">Pendiente</Badge>,
  EN_PRODUCCION: <Badge variant="info">En producción</Badge>,
  ENTREGADO: <Badge variant="success">Entregado</Badge>,
  CANCELADO: <Badge variant="secondary">Cancelado</Badge>,
};

function getHoy() {
  return new Date().toISOString().split("T")[0];
}

export function PedidosClient({ clientes, categorias, userRol }: PedidosClientProps) {
  const [pedidos, setPedidos] = useState<PedidoResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const listaPrintRef = useRef<HTMLDivElement>(null);
  const detallePrintRef = useRef<HTMLDivElement>(null);
  const handlePrintLista = useReactToPrint({ contentRef: listaPrintRef });
  const handlePrintDetalle = useReactToPrint({ contentRef: detallePrintRef });
  const pageSize = 20;
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState("");

  // Filtros de fecha — por defecto hoy
  const [fechaDesde, setFechaDesde] = useState(getHoy);
  const [fechaHasta, setFechaHasta] = useState(getHoy);

  const [showForm, setShowForm] = useState(false);
  const [pedidoEditar, setPedidoEditar] = useState<string | null>(null);
  const [pedidoVer, setPedidoVer] = useState<PedidoDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // IVA modal para cambio de estado a ENTREGADO
  const [ivaModal, setIvaModal] = useState<{ pedidoId: string; nuevoEstado: string } | null>(null);
  const [ivaSeleccionado, setIvaSeleccionado] = useState<0 | 0.21>(0);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  // Modal fecha de producción para EN_PRODUCCION
  const [prodModal, setProdModal] = useState<{ pedidoId: string } | null>(null);
  const [fechaProdSeleccionada, setFechaProdSeleccionada] = useState(getHoy());

  const cargarPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(filtroEstado !== "todos" && { estado: filtroEstado }),
        ...(filtroCliente && { clienteId: filtroCliente }),
        ...(fechaDesde && { desde: fechaDesde }),
        ...(fechaHasta && { hasta: fechaHasta }),
      });

      const res = await fetch(`/api/pedidos?${params}`);
      const json = await res.json();
      setPedidos(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, filtroEstado, filtroCliente, fechaDesde, fechaHasta]);

  useEffect(() => { cargarPedidos(); }, [cargarPedidos]);

  const filteredPedidos = pedidos.filter((p) =>
    search
      ? p.cliente.nombre.toLowerCase().includes(search.toLowerCase())
      : true
  );

  function limpiarFechas() {
    setFechaDesde("");
    setFechaHasta("");
    setPage(1);
  }

  function verTodos() {
    limpiarFechas();
  }

  // Iniciar cambio de estado
  function iniciarCambioEstado(pedidoId: string, nuevoEstado: string) {
    if (nuevoEstado === "ENTREGADO") {
      setIvaSeleccionado(0);
      setIvaModal({ pedidoId, nuevoEstado });
    } else if (nuevoEstado === "EN_PRODUCCION") {
      setFechaProdSeleccionada(getHoy());
      setProdModal({ pedidoId });
    } else {
      ejecutarCambioEstado(pedidoId, nuevoEstado, 0);
    }
  }

  async function confirmarProduccion() {
    if (!prodModal) return;
    await ejecutarCambioEstado(prodModal.pedidoId, "EN_PRODUCCION", 0, fechaProdSeleccionada);
    setProdModal(null);
  }

  async function ejecutarCambioEstado(pedidoId: string, nuevoEstado: string, tasaIva: number, fechaProduccion?: string) {
    setCambiandoEstado(true);
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado, tasaIva, ...(fechaProduccion && { fechaProduccion }) }),
      });
      if (res.ok) {
        toast({ title: "Estado actualizado" });
        cargarPedidos();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } finally {
      setCambiandoEstado(false);
    }
  }

  async function confirmarEntrega() {
    if (!ivaModal) return;
    await ejecutarCambioEstado(ivaModal.pedidoId, "ENTREGADO", ivaSeleccionado);
    setIvaModal(null);
  }

  async function verDetallePedido(id: string) {
    setLoadingDetalle(true);
    try {
      const res = await fetch(`/api/pedidos/${id}`);
      const json = await res.json();
      if (res.ok) setPedidoVer(json.data);
      else toast({ title: "Error al cargar detalle", variant: "destructive" });
    } finally {
      setLoadingDetalle(false);
    }
  }

  async function cancelarPedido(id: string) {
    if (!confirm("¿Confirmás cancelar este pedido?")) return;
    const res = await fetch(`/api/pedidos/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Pedido cancelado", variant: "default" });
      cargarPedidos();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
  }

  const totalPages = Math.ceil(total / pageSize);
  const esAdmin = userRol === "ADMIN" || userRol === "OPERARIO";
  const hayFiltroFecha = fechaDesde || fechaHasta;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm">
            {hayFiltroFecha
              ? `${total} pedidos${fechaDesde === fechaHasta && fechaDesde ? ` del ${formatDate(fechaDesde)}` : ""}`
              : `${total} pedidos en total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handlePrintLista()}>
            <Printer className="h-4 w-4" />
            Imprimir lista
          </Button>
          <Button onClick={() => { setPedidoEditar(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Nuevo pedido
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3">
            {/* Fila 1: búsqueda + cliente + estado */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {userRol !== "CLIENTE" && (
                <Select value={filtroCliente} onValueChange={(v) => { setFiltroCliente(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue placeholder="Todos los distribuidores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los distribuidores</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={filtroEstado} onValueChange={(v) => { setFiltroEstado(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="EN_PRODUCCION">En producción</SelectItem>
                  <SelectItem value="ENTREGADO">Entregado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fila 2: filtro de fecha */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600 whitespace-nowrap">Desde</Label>
                <Input
                  type="date"
                  className="w-40"
                  value={fechaDesde}
                  onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600 whitespace-nowrap">Hasta</Label>
                <Input
                  type="date"
                  className="w-40"
                  value={fechaHasta}
                  onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }}
                />
              </div>
              {hayFiltroFecha && (
                <Button variant="ghost" size="sm" onClick={verTodos} className="text-gray-500 gap-1">
                  <X className="h-3 w-3" />
                  Ver todos
                </Button>
              )}
              {!hayFiltroFecha && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setFechaDesde(getHoy()); setFechaHasta(getHoy()); setPage(1); }}
                  className="text-gray-600"
                >
                  Hoy
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <div ref={listaPrintRef}>
        {/* Encabezado solo visible en impresión */}
        <div className="hidden print:block mb-3 px-1">
          <h1 className="text-xl font-bold">Lista de pedidos — Postres Tammy Light</h1>
          {(fechaDesde || fechaHasta) && (
            <p className="text-gray-500 text-sm">{fechaDesde && formatDate(fechaDesde)}{fechaDesde !== fechaHasta && fechaHasta ? ` — ${formatDate(fechaHasta)}` : ""}</p>
          )}
        </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Cargando pedidos...</div>
          ) : filteredPedidos.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p className="font-medium">No hay pedidos</p>
              {hayFiltroFecha && (
                <p className="text-sm mt-1">
                  No hay pedidos para este período.{" "}
                  <button onClick={verTodos} className="text-pink-600 underline">Ver todos</button>
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Distribuidor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Notas</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha entrega</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Horario</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 print:hidden">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPedidos.map((pedido) => {
                    const puedeEditar = puedeEditarPedido(
                      new Date(pedido.fechaEntrega),
                      new Date(pedido.createdAt)
                    );
                    const esCancelado = pedido.estado === "CANCELADO";
                    const esEntregado = pedido.estado === "ENTREGADO";
                    return (
                      <tr key={pedido.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{pedido.cliente.nombre}</td>

                        {/* Notas — al lado del distribuidor */}
                        <td className="px-4 py-3 max-w-[200px]">
                          {pedido.notas ? (
                            <span
                              className="text-xs text-amber-700 bg-amber-50 print:bg-transparent print:text-gray-800 rounded px-1.5 py-0.5 line-clamp-2 print:line-clamp-none print:whitespace-normal"
                              title={pedido.notas}
                            >
                              {pedido.notas}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs print:hidden">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-gray-600">{formatDate(pedido.fechaEntrega)}</td>
                        <td className="px-4 py-3 text-gray-600">{getRangoLabel(pedido.rangoHorario)}</td>
                        <td className="px-4 py-3 text-gray-600">{pedido._count.items} productos</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatCurrency(Number(pedido.montoTotal))}
                        </td>

                        {/* Estado — Select para admin/operario, Badge para el resto */}
                        <td className="px-4 py-3">
                          {esAdmin && !esCancelado && !esEntregado ? (
                            <Select
                              value={pedido.estado}
                              onValueChange={(v) => iniciarCambioEstado(pedido.id, v)}
                            >
                              <SelectTrigger className="h-8 w-40 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ESTADOS_DISPONIBLES.filter(e => e.value !== "CANCELADO").map((e) => (
                                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            estadoBadge[pedido.estado]
                          )}
                        </td>

                        {/* Acciones simplificadas */}
                        <td className="px-4 py-3 print:hidden">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalle"
                              onClick={() => verDetallePedido(pedido.id)}
                              disabled={loadingDetalle}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!esCancelado && !esEntregado && (userRol === "ADMIN" || puedeEditar) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar"
                                onClick={() => { setPedidoEditar(pedido.id); setShowForm(true); }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            {!esCancelado && !esEntregado && (userRol === "ADMIN" || puedeEditar) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Cancelar pedido"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => cancelarPedido(pedido.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 print:hidden">
              <p className="text-sm text-gray-500">
                Página {page} de {totalPages} ({total} pedidos)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Modal detalle pedido */}
      <Dialog open={!!pedidoVer} onOpenChange={() => setPedidoVer(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>Detalle del pedido</DialogTitle>
              {pedidoVer && (
                <Button variant="outline" size="sm" onClick={() => handlePrintDetalle()}>
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              )}
            </div>
          </DialogHeader>
          {pedidoVer && (
            <div ref={detallePrintRef} className="space-y-4 text-sm">
              {/* Info general */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-3">
                <div><span className="text-gray-500">Distribuidor:</span> <span className="font-medium">{pedidoVer.cliente.nombre}</span></div>
                <div className="flex items-center gap-1"><span className="text-gray-500">Estado:</span> {estadoBadge[pedidoVer.estado]}</div>
                <div><span className="text-gray-500">Entrega:</span> <span className="font-medium">{formatDate(pedidoVer.fechaEntrega)}</span></div>
                <div><span className="text-gray-500">Horario:</span> <span className="font-medium">{getRangoLabel(pedidoVer.rangoHorario)}</span></div>
              </div>

              {/* Lista de productos */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Productos ({pedidoVer.items.length})</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Producto</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-600">Cant.</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Precio</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidoVer.items.map((item, i) => (
                        <tr key={item.productoId} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                          <td className="px-3 py-2">
                            <span className="font-medium text-gray-900">{item.producto.nombre}</span>
                            <span className="text-gray-400 ml-1">· {item.producto.categoria.nombre}</span>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">{item.cantidad}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(Number(item.precioUnitario))}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCurrency(Number(item.subtotal))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-pink-50">
                        <td colSpan={3} className="px-3 py-2 font-bold text-gray-700">Total</td>
                        <td className="px-3 py-2 text-right font-bold text-pink-600 text-sm">{formatCurrency(Number(pedidoVer.montoTotal))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notas */}
              {pedidoVer.notas && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <span className="text-amber-700 text-xs font-medium">Notas:</span>
                  <p className="mt-1 text-gray-700">{pedidoVer.notas}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal formulario nuevo/editar */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {pedidoEditar ? "Editar pedido" : "Nuevo pedido"}
            </DialogTitle>
          </DialogHeader>
          <FormularioPedido
            clientes={clientes}
            categorias={categorias}
            pedidoId={pedidoEditar ?? undefined}
            onSuccess={() => {
              setShowForm(false);
              setPedidoEditar(null);
              cargarPedidos();
            }}
            onCancel={() => { setShowForm(false); setPedidoEditar(null); }}
            userRol={userRol}
          />
        </DialogContent>
      </Dialog>

      {/* Modal fecha de producción */}
      <Dialog open={!!prodModal} onOpenChange={() => setProdModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Para qué día se produce?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Elegí el día en que se va a fabricar este pedido.
            </p>
            <div className="space-y-2">
              <Label>Fecha de producción</Label>
              <Input
                type="date"
                value={fechaProdSeleccionada}
                onChange={(e) => setFechaProdSeleccionada(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setProdModal(null)}>Cancelar</Button>
              <Button onClick={confirmarProduccion} disabled={cambiandoEstado || !fechaProdSeleccionada}>
                {cambiandoEstado ? "Guardando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { font-size: 10px !important; }
          .print\\:hidden { display: none !important; }
          nav, header, aside { display: none !important; }
        }
      `}</style>

      {/* Modal IVA para ENTREGADO */}
      <Dialog open={!!ivaModal} onOpenChange={() => setIvaModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Marcar como Entregado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Al marcar como entregado se generará la factura automáticamente.
              ¿El pedido incluye IVA?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIvaSeleccionado(0)}
                className={`flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                  ivaSeleccionado === 0
                    ? "border-pink-600 bg-pink-50 text-pink-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                Sin IVA
                <span className="block text-xs font-normal opacity-70">Factura sin impuesto</span>
              </button>
              <button
                onClick={() => setIvaSeleccionado(0.21)}
                className={`flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                  ivaSeleccionado === 0.21
                    ? "border-pink-600 bg-pink-50 text-pink-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                Con IVA 21%
                <span className="block text-xs font-normal opacity-70">Factura con impuesto</span>
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIvaModal(null)}>Cancelar</Button>
              <Button onClick={confirmarEntrega} disabled={cambiandoEstado}>
                {cambiandoEstado ? "Guardando..." : "Confirmar entrega"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
