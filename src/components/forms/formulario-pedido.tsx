"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, RANGOS_HORARIO } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Search, X, Minus, Plus } from "lucide-react";
import type { Cliente, Categoria, Producto } from "@/types";

interface CategoriaConProductos extends Categoria {
  productos: Producto[];
}

interface ItemPedido {
  productoId: string;
  nombre: string;
  categoriaId: string;
  categoriaNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface FormularioPedidoProps {
  clientes: Cliente[];
  categorias: CategoriaConProductos[];
  pedidoId?: string;
  copiarDePedidoId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  userRol: string;
}

export function FormularioPedido({
  clientes,
  categorias,
  pedidoId,
  copiarDePedidoId,
  onSuccess,
  onCancel,
  userRol,
}: FormularioPedidoProps) {
  const [clienteId, setClienteId] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [rangoHorario, setRangoHorario] = useState("SIN_ESPECIFICAR");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState<string>("todas");
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Cargar pedido existente o copia
  useEffect(() => {
    const cargarPedido = async (id: string, esCopia = false) => {
      setCargando(true);
      try {
        const res = await fetch(`/api/pedidos/${id}`);
        const json = await res.json();
        if (res.ok && json.data) {
          const p = json.data;
          if (!esCopia) {
            setClienteId(p.clienteId);
            setFechaEntrega(p.fechaEntrega.split("T")[0]);
          }
          setRangoHorario(p.rangoHorario);
          setNotas(esCopia ? "" : (p.notas ?? ""));
          setItems(
            p.items.map((item: {
              productoId: string;
              producto: { nombre: string; categoriaId: string; categoria: { nombre: string } };
              cantidad: number;
              precioUnitario: number;
              subtotal: number;
            }) => ({
              productoId: item.productoId,
              nombre: item.producto.nombre,
              categoriaId: item.producto.categoriaId,
              categoriaNombre: item.producto.categoria.nombre,
              cantidad: item.cantidad,
              precioUnitario: Number(item.precioUnitario),
              subtotal: Number(item.subtotal),
            }))
          );
        }
      } finally {
        setCargando(false);
      }
    };

    if (pedidoId) cargarPedido(pedidoId);
    else if (copiarDePedidoId) cargarPedido(copiarDePedidoId, true);
  }, [pedidoId, copiarDePedidoId]);

  // Productos filtrados por categoría y búsqueda
  const productosFiltrados = useMemo(() => {
    const todosProd = categorias.flatMap((c) =>
      c.productos.map((p) => ({ ...p, categoriaNombre: c.nombre }))
    );
    return todosProd.filter((p) => {
      const matchBusqueda = busqueda
        ? p.nombre.toLowerCase().includes(busqueda.toLowerCase())
        : true;
      const matchCategoria = categoriaActiva === "todas" || p.categoriaId === categoriaActiva;
      return matchBusqueda && matchCategoria;
    });
  }, [categorias, busqueda, categoriaActiva]);

  function setCantidad(productoId: string, cantidad: number) {
    if (cantidad <= 0) {
      setItems((prev) => prev.filter((i) => i.productoId !== productoId));
      return;
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.productoId === productoId);
      if (existing) {
        return prev.map((i) =>
          i.productoId === productoId
            ? { ...i, cantidad, subtotal: cantidad * i.precioUnitario }
            : i
        );
      }
      // Buscar el producto para agregar
      const prod = categorias
        .flatMap((c) => c.productos.map((p) => ({ ...p, categoriaNombre: c.nombre, categoriaId: c.id })))
        .find((p) => p.id === productoId);
      if (!prod) return prev;
      return [
        ...prev,
        {
          productoId,
          nombre: prod.nombre,
          categoriaId: prod.categoriaId,
          categoriaNombre: prod.categoriaNombre,
          cantidad,
          precioUnitario: Number(prod.precio),
          subtotal: cantidad * Number(prod.precio),
        },
      ];
    });
  }

  function getCantidad(productoId: string): number {
    return items.find((i) => i.productoId === productoId)?.cantidad ?? 0;
  }

  const montoTotal = items.reduce((acc, i) => acc + i.subtotal, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) { toast({ title: "Seleccioná un cliente", variant: "destructive" }); return; }
    if (!fechaEntrega) { toast({ title: "Seleccioná una fecha de entrega", variant: "destructive" }); return; }
    if (items.length === 0) { toast({ title: "Agregá al menos un producto", variant: "destructive" }); return; }

    setLoading(true);
    try {
      const body = {
        clienteId,
        fechaEntrega,
        rangoHorario,
        notas,
        items: items.map((i) => ({
          productoId: i.productoId,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
        })),
      };

      const url = pedidoId ? `/api/pedidos/${pedidoId}` : "/api/pedidos";
      const method = pedidoId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (res.ok) {
        toast({ title: pedidoId ? "Pedido actualizado" : "Pedido creado", variant: "success" as never });
        onSuccess();
      } else {
        toast({ title: "Error", description: json.error ?? "Error al guardar", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  if (cargando) return <div className="py-8 text-center text-gray-500">Cargando pedido...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos del pedido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {userRol !== "CLIENTE" && (
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Fecha de entrega *</Label>
          <Input
            type="date"
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Rango horario de retiro</Label>
          <Select value={rangoHorario} onValueChange={setRangoHorario}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RANGOS_HORARIO).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Notas (opcional)</Label>
          <Input
            placeholder="Indicaciones especiales..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>
      </div>

      {/* Buscador de productos */}
      <div className="space-y-3">
        <Label>Productos</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar postre..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs categorías */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoriaActiva("todas")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${categoriaActiva === "todas" ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Todas
          </button>
          {categorias.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoriaActiva(c.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${categoriaActiva === c.id ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {c.nombre}
            </button>
          ))}
        </div>

        {/* Lista de productos */}
        <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
          {productosFiltrados.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No se encontraron productos</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {productosFiltrados.map((prod) => {
                const cantidad = getCantidad(prod.id);
                return (
                  <div
                    key={prod.id}
                    className={`flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors ${cantidad > 0 ? "bg-pink-50" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{prod.nombre}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(Number(prod.precio))}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setCantidad(prod.id, cantidad - 1)}
                        disabled={cantidad === 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        className="w-14 h-7 text-center text-sm"
                        value={cantidad || ""}
                        placeholder="0"
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setCantidad(prod.id, val);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setCantidad(prod.id, cantidad + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resumen del pedido */}
      {items.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Resumen del pedido</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {items.map((item) => (
              <div key={item.productoId} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex-1">{item.nombre}</span>
                <div className="flex items-center gap-3 ml-2">
                  <Badge variant="secondary" className="text-xs">{item.cantidad}</Badge>
                  <span className="font-medium w-24 text-right">{formatCurrency(item.subtotal)}</span>
                  <button
                    type="button"
                    onClick={() => setCantidad(item.productoId, 0)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-pink-600 text-lg">{formatCurrency(montoTotal)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : pedidoId ? "Actualizar pedido" : "Crear pedido"}
        </Button>
      </div>
    </form>
  );
}
