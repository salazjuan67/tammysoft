"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, RANGOS_HORARIO, getRangoLabel } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Search, X, Minus, Plus, Eye, Copy } from "lucide-react";
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

interface PedidoHistorico {
  id: string;
  fechaEntrega: string;
  rangoHorario: string;
  estado: string;
  notas: string | null;
  montoTotal: number;
  items: Array<{
    productoId: string;
    cantidad: number;
    producto: { id: string; nombre: string; activo?: boolean; precio: number; categoriaId: string; categoria: { nombre: string } };
  }>;
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
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState<PedidoHistorico[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [previewPedido, setPreviewPedido] = useState<PedidoHistorico | null>(null);

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
  const cantidadTotal = items.reduce((acc, i) => acc + i.cantidad, 0);

  async function abrirHistorial() {
    if (!clienteId) {
      toast({ title: "Seleccioná un cliente primero", variant: "destructive" });
      return;
    }
    setShowHistorial(true);
    setPreviewPedido(null);
    setBusquedaHistorial("");
    setCargandoHistorial(true);
    try {
      const res = await fetch(`/api/pedidos?clienteId=${clienteId}&pageSize=80&includeItems=true`);
      const json = await res.json();
      const data = ((json.data ?? []) as PedidoHistorico[]).filter((p) => p.estado !== "CANCELADO" && p.id !== pedidoId);
      setHistorial(data);
    } finally {
      setCargandoHistorial(false);
    }
  }

  function confirmarRepetir(pedido: PedidoHistorico) {
    const catalogo = categorias.flatMap((c) => c.productos.map((p) => ({ ...p, categoriaNombre: c.nombre, categoriaId: c.id })));
    const omitidos: string[] = [];
    const nuevos: ItemPedido[] = [];
    for (const item of pedido.items) {
      const prod = catalogo.find((p) => p.id === item.productoId);
      if (!prod || prod.activo === false) {
        omitidos.push(item.producto.nombre);
        continue;
      }
      const precio = Number(prod.precio);
      nuevos.push({
        productoId: prod.id,
        nombre: prod.nombre,
        categoriaId: prod.categoriaId,
        categoriaNombre: prod.categoriaNombre,
        cantidad: item.cantidad,
        precioUnitario: precio,
        subtotal: precio * item.cantidad,
      });
    }
    setItems(nuevos);
    if (pedido.notas) setNotas(pedido.notas);
    if (pedido.rangoHorario) setRangoHorario(pedido.rangoHorario);
    setShowHistorial(false);
    setPreviewPedido(null);
    if (omitidos.length) {
      toast({ title: "Pedido copiado con avisos", description: `No se cargaron: ${omitidos.join(", ")}`, variant: "destructive" });
    } else {
      toast({ title: "Pedido cargado. Revisá fecha y productos." });
    }
  }

  const historialFiltrado = historial.filter((p) => {
    const q = busquedaHistorial.toLowerCase().trim();
    if (!q) return true;
    const fecha = formatDate(p.fechaEntrega);
    const productos = p.items.map((i) => i.producto.nombre).join(" ");
    return `${p.notas ?? ""} ${fecha} ${productos}`.toLowerCase().includes(q);
  });

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
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        {userRol !== "CLIENTE" && (
          <div className="space-y-1">
            <Label className="text-xs">Cliente *</Label>
            <Select value={clienteId || undefined} onValueChange={(v) => { setClienteId(v); setShowHistorial(false); setPreviewPedido(null); }}>
              <SelectTrigger className="h-9">
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
        <div className="space-y-1">
          <Label className="text-xs">Fecha de entrega *</Label>
          <Input
            type="date"
            className="h-9"
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Rango horario</Label>
          <Select value={rangoHorario} onValueChange={setRangoHorario}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RANGOS_HORARIO).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 col-span-2 lg:col-span-1">
          <Label className="text-xs">Notas / cliente final</Label>
          <Input
            className="h-9"
            placeholder="Nombre del cliente final..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>
        {!pedidoId && userRol !== "CLIENTE" && (
          <div className="space-y-1">
            <Label className="text-xs invisible">Repetir</Label>
            <Button type="button" variant="outline" className="h-9 w-full" onClick={abrirHistorial} disabled={!clienteId}>
              <Copy className="h-4 w-4" />
              Repetir
            </Button>
          </div>
        )}
      </div>

      <div className={`grid min-h-0 flex-1 grid-cols-1 gap-3 ${showHistorial ? "" : "lg:grid-cols-[1fr_320px]"}`}>
        {showHistorial ? (
          <div className="flex min-h-0 flex-col gap-2 rounded-lg border border-pink-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-gray-800">Historial de pedidos</h4>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowHistorial(false); setPreviewPedido(null); }}>Cerrar</Button>
            </div>
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="h-9 pl-9"
                placeholder="Buscar por fecha, notas o producto..."
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
              />
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">
              <div className="min-h-0 overflow-y-auto rounded-lg border border-gray-100">
                {cargandoHistorial ? (
                  <p className="py-8 text-center text-sm text-gray-400">Cargando historial...</p>
                ) : historialFiltrado.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No hay pedidos anteriores</p>
                ) : (
                  historialFiltrado.map((p) => {
                    const unidades = p.items.reduce((s, i) => s + i.cantidad, 0);
                    return (
                      <div key={p.id} className={`flex items-center gap-2 border-b border-gray-50 px-3 py-2 ${previewPedido?.id === p.id ? "bg-pink-50" : "hover:bg-gray-50"}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{formatDate(p.fechaEntrega)} · {unidades} postres</p>
                          <p className="truncate text-xs text-gray-500">
                            {p.notas ? `📝 ${p.notas}` : getRangoLabel(p.rangoHorario)} · {formatCurrency(Number(p.montoTotal))}
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Previsualizar" onClick={() => setPreviewPedido(p)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex min-h-0 flex-col rounded-lg border border-gray-100 bg-gray-50 p-3">
                {!previewPedido ? (
                  <p className="m-auto text-center text-sm text-gray-400">Tocá el ojito para previsualizar un pedido</p>
                ) : (
                  <>
                    <p className="mb-2 text-sm font-semibold text-gray-800">
                      Preview · {formatDate(previewPedido.fechaEntrega)}
                      {previewPedido.notas ? ` · ${previewPedido.notas}` : ""}
                    </p>
                    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto text-sm">
                      {previewPedido.items.map((item) => (
                        <div key={item.productoId} className="flex justify-between gap-2">
                          <span className="truncate text-gray-700">{item.cantidad}× {item.producto.nombre}</span>
                          <span className="shrink-0 text-xs text-gray-400">{item.producto.categoria?.nombre}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 shrink-0 border-t border-gray-200 pt-2">
                      <p className="mb-2 text-xs text-gray-500">Se cargará con los precios actuales. Confirmá para copiarlo al formulario.</p>
                      <Button type="button" className="w-full" onClick={() => confirmarRepetir(previewPedido)}>
                        Confirmar y usar este pedido
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
        <div className="flex min-h-0 flex-col gap-2">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar postre..."
              className="h-9 pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
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
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200">
            {productosFiltrados.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No se encontraron productos</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {productosFiltrados.map((prod) => {
                  const cantidad = getCantidad(prod.id);
                  return (
                    <div
                      key={prod.id}
                      className={`flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-gray-50 ${cantidad > 0 ? "bg-pink-50" : ""}`}
                    >
                      <span className="w-28 shrink-0 truncate rounded-full bg-pink-100 px-2 py-0.5 text-center text-xs font-semibold text-pink-800">
                        {prod.categoriaNombre}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{prod.nombre}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(Number(prod.precio))}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setCantidad(prod.id, cantidad - 1)} disabled={cantidad === 0}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          className="h-7 w-12 text-center text-sm"
                          value={cantidad || ""}
                          placeholder="0"
                          onChange={(e) => setCantidad(prod.id, parseInt(e.target.value) || 0)}
                        />
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setCantidad(prod.id, cantidad + 1)}>
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
        )}

        {!showHistorial && (
        <div className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-gray-50 p-3">
          <h4 className="mb-2 shrink-0 text-sm font-medium text-gray-700">Resumen</h4>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">Todavía no hay productos</p>
            ) : (
              items.map((item) => (
                <div key={item.productoId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="max-w-[90px] shrink-0 truncate rounded-full bg-pink-100 px-2 py-0.5 text-center text-[10px] font-semibold text-pink-800">{item.categoriaNombre}</span>
                  <span className="min-w-0 flex-1 truncate text-gray-600">{item.nombre}</span>
                  <Badge variant="secondary" className="text-xs">{item.cantidad}</Badge>
                  <span className="w-16 shrink-0 text-right text-xs font-medium">{formatCurrency(item.subtotal)}</span>
                  <button type="button" onClick={() => setCantidad(item.productoId, 0)} className="text-gray-400 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="mt-2 shrink-0 space-y-2 border-t border-gray-200 pt-2">
            <div className="flex justify-between text-sm font-semibold text-gray-800">
              <span>Total productos</span>
              <span>{cantidadTotal} unidades</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-lg text-pink-600">{formatCurrency(montoTotal)}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Guardando..." : pedidoId ? "Actualizar" : "Crear pedido"}
              </Button>
            </div>
          </div>
        </div>
        )}
      </div>
    </form>
  );
}
