"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ItemCarrito } from "./ResumenPedido";

interface Categoria { id: string; nombre: string; orden: number }
interface Producto { id: string; nombre: string; descripcion: string | null; precio: number; categoria: Categoria }

interface SelectorProductosProps {
  carrito: ItemCarrito[];
  onCambio: (carrito: ItemCarrito[]) => void;
}

export default function SelectorProductos({ carrito, onCambio }: SelectorProductosProps) {
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  // Track which categories are collapsed (default: all expanded)
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function cargar() {
      const res = await fetch("/api/productos?activos=true&limit=200");
      const json = await res.json();
      const rawProds: Array<{ id: string; nombre: string; descripcion: string | null; precio: unknown; categoria: Categoria }> = json.data ?? [];
      setProductos(rawProds.map((p) => ({ ...p, precio: Number(p.precio) })));
      setCargando(false);
    }
    cargar();
  }, []);

  const getCantidad = useCallback(
    (productoId: string) => carrito.find((i) => i.productoId === productoId)?.cantidad ?? 0,
    [carrito]
  );

  function setCantidad(producto: Producto, cantidad: number) {
    const nuevaCantidad = Math.max(0, cantidad);
    const sinEste = carrito.filter((i) => i.productoId !== producto.id);
    if (nuevaCantidad === 0) {
      onCambio(sinEste);
    } else {
      onCambio([...sinEste, { productoId: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: nuevaCantidad }]);
    }
  }

  function toggleCategoria(catId: string) {
    setColapsadas((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  if (cargando) return <p className="text-gray-400 text-sm text-center py-8">Cargando catálogo...</p>;

  // Build grouped structure
  const filtrados = busqueda
    ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos;

  // Group by category, sorted by categoria.orden then nombre
  const grupos = new Map<string, { categoria: Categoria; productos: Producto[] }>();
  for (const prod of filtrados) {
    const catId = prod.categoria?.id ?? "sin-cat";
    if (!grupos.has(catId)) {
      grupos.set(catId, { categoria: prod.categoria, productos: [] });
    }
    grupos.get(catId)!.productos.push(prod);
  }

  // Sort categories by orden, then products alphabetically within each
  const gruposOrdenados = [...grupos.values()]
    .sort((a, b) => (a.categoria?.orden ?? 0) - (b.categoria?.orden ?? 0))
    .map((g) => ({ ...g, productos: [...g.productos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")) }));

  const totalSeleccionados = carrito.reduce((s, i) => s + i.cantidad, 0);

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto en todas las categorías..."
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
        {busqueda && (
          <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
            ✕
          </button>
        )}
      </div>

      {/* Grupos por categoría */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
        {gruposOrdenados.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Sin resultados para &ldquo;{busqueda}&rdquo;</p>
        ) : (
          gruposOrdenados.map(({ categoria, productos: prods }) => {
            const catId = categoria?.id ?? "sin-cat";
            const colapsada = colapsadas.has(catId);
            const cantEnCat = prods.reduce((s, p) => s + getCantidad(p.id), 0);

            return (
              <div key={catId} className="rounded-xl border border-gray-100 overflow-hidden">
                {/* Header de categoría */}
                <button
                  onClick={() => toggleCategoria(catId)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-pink-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {colapsada ? (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      {categoria?.nombre ?? "Sin categoría"}
                    </span>
                    <span className="text-xs text-gray-400">({prods.length})</span>
                  </div>
                  {cantEnCat > 0 && (
                    <span className="text-xs font-bold bg-pink-600 text-white rounded-full px-2 py-0.5">
                      {cantEnCat} u.
                    </span>
                  )}
                </button>

                {/* Productos de la categoría */}
                {!colapsada && (
                  <div className="divide-y divide-gray-50">
                    {prods.map((prod) => {
                      const cantidad = getCantidad(prod.id);
                      return (
                        <div
                          key={prod.id}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors ${cantidad > 0 ? "bg-pink-50" : "bg-white hover:bg-gray-50"}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{prod.nombre}</p>
                            {prod.descripcion && (
                              <p className="text-xs text-gray-400 truncate">{prod.descripcion}</p>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-pink-600 flex-shrink-0">
                            {formatCurrency(prod.precio)}
                          </span>
                          {/* Cantidad */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => setCantidad(prod, cantidad - 1)}
                              disabled={cantidad === 0}
                              className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 hover:border-pink-400 hover:text-pink-600 disabled:opacity-30 text-base leading-none flex items-center justify-center transition-colors"
                            >−</button>
                            <input
                              type="number"
                              min={0}
                              value={cantidad || ""}
                              onChange={(e) => setCantidad(prod, parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className={`w-11 text-center border rounded-lg text-sm py-1 focus:outline-none focus:ring-2 focus:ring-pink-300 ${cantidad > 0 ? "border-pink-300 bg-pink-50 font-semibold" : "border-gray-200"}`}
                            />
                            <button
                              onClick={() => setCantidad(prod, cantidad + 1)}
                              className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 hover:border-pink-400 hover:text-pink-600 text-base leading-none flex items-center justify-center transition-colors"
                            >+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        {filtrados.length} producto{filtrados.length !== 1 ? "s" : ""}
        {totalSeleccionados > 0 && (
          <span className="text-pink-600 font-medium"> · {totalSeleccionados} unidades seleccionadas</span>
        )}
      </p>
    </div>
  );
}
