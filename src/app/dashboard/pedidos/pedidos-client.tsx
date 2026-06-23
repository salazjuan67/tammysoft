"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate, getRangoLabel, RANGOS_HORARIO, puedeEditarPedido } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Edit2, Trash2, Copy, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { FormularioPedido } from "@/components/forms/formulario-pedido";
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

interface PedidosClientProps {
  clientes: Cliente[];
  categorias: CategoriaConProductos[];
  userRol: string;
  userId: string;
}

const estadoBadge: Record<string, React.ReactNode> = {
  PENDIENTE: <Badge variant="warning">Pendiente</Badge>,
  EN_PRODUCCION: <Badge variant="info">En producción</Badge>,
  ENTREGADO: <Badge variant="success">Entregado</Badge>,
  CANCELADO: <Badge variant="secondary">Cancelado</Badge>,
};

export function PedidosClient({ clientes, categorias, userRol }: PedidosClientProps) {
  const [pedidos, setPedidos] = useState<PedidoResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [pedidoEditar, setPedidoEditar] = useState<string | null>(null);
  const [pedidoVer, setPedidoVer] = useState<PedidoResumen | null>(null);

  const cargarPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(filtroEstado !== "todos" && { estado: filtroEstado }),
        ...(filtroCliente && { clienteId: filtroCliente }),
      });

      const res = await fetch(`/api/pedidos?${params}`);
      const json = await res.json();
      setPedidos(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, filtroEstado, filtroCliente]);

  useEffect(() => { cargarPedidos(); }, [cargarPedidos]);

  const filteredPedidos = pedidos.filter((p) =>
    search
      ? p.cliente.nombre.toLowerCase().includes(search.toLowerCase())
      : true
  );

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

  async function repetirPedido(id: string) {
    const res = await fetch(`/api/pedidos/${id}`);
    const json = await res.json();
    if (res.ok) {
      setPedidoEditar(`copy:${id}`);
      setShowForm(true);
    } else {
      toast({ title: "Error", description: json.error, variant: "destructive" });
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm">{total} pedidos en total</p>
        </div>
        <Button onClick={() => { setPedidoEditar(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" />
          Nuevo pedido
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
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
              <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los clientes</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
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
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Cargando pedidos...</div>
          ) : filteredPedidos.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p className="font-medium">No hay pedidos</p>
              <p className="text-sm mt-1">Creá el primer pedido con el botón de arriba</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha entrega</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Horario</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPedidos.map((pedido) => {
                    const puedeEditar = puedeEditarPedido(
                      new Date(pedido.fechaEntrega),
                      new Date(pedido.createdAt)
                    );
                    const esCancelado = pedido.estado === "CANCELADO";
                    return (
                      <tr key={pedido.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{pedido.cliente.nombre}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(pedido.fechaEntrega)}</td>
                        <td className="px-4 py-3 text-gray-600">{getRangoLabel(pedido.rangoHorario)}</td>
                        <td className="px-4 py-3 text-gray-600">{pedido._count.items} productos</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatCurrency(Number(pedido.montoTotal))}
                        </td>
                        <td className="px-4 py-3">{estadoBadge[pedido.estado]}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalle"
                              onClick={() => setPedidoVer(pedido)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!esCancelado && (userRol === "ADMIN" || puedeEditar) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar"
                                onClick={() => { setPedidoEditar(pedido.id); setShowForm(true); }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Repetir pedido"
                              onClick={() => repetirPedido(pedido.id)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Imprimir"
                              onClick={() => window.print()}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {!esCancelado && (userRol === "ADMIN" || puedeEditar) && (
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
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

      {/* Modal detalle pedido */}
      <Dialog open={!!pedidoVer} onOpenChange={() => setPedidoVer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del pedido</DialogTitle>
          </DialogHeader>
          {pedidoVer && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{pedidoVer.cliente.nombre}</span></div>
                <div><span className="text-gray-500">Estado:</span> {estadoBadge[pedidoVer.estado]}</div>
                <div><span className="text-gray-500">Entrega:</span> <span className="font-medium">{formatDate(pedidoVer.fechaEntrega)}</span></div>
                <div><span className="text-gray-500">Horario:</span> <span className="font-medium">{getRangoLabel(pedidoVer.rangoHorario)}</span></div>
                <div><span className="text-gray-500">Items:</span> <span className="font-medium">{pedidoVer._count.items} productos</span></div>
                <div><span className="text-gray-500">Total:</span> <span className="font-bold text-pink-600">{formatCurrency(Number(pedidoVer.montoTotal))}</span></div>
              </div>
              {pedidoVer.notas && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-500 text-xs">Notas:</span>
                  <p className="mt-1">{pedidoVer.notas}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal formulario */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {pedidoEditar
                ? pedidoEditar.startsWith("copy:")
                  ? "Repetir pedido"
                  : "Editar pedido"
                : "Nuevo pedido"}
            </DialogTitle>
          </DialogHeader>
          <FormularioPedido
            clientes={clientes}
            categorias={categorias}
            pedidoId={pedidoEditar && !pedidoEditar.startsWith("copy:") ? pedidoEditar : undefined}
            copiarDePedidoId={pedidoEditar?.startsWith("copy:") ? pedidoEditar.replace("copy:", "") : undefined}
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
    </div>
  );
}
