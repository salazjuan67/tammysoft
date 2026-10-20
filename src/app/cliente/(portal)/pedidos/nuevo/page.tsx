"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SelectorProductos from "@/components/cliente/SelectorProductos";
import ResumenPedido, { type ItemCarrito } from "@/components/cliente/ResumenPedido";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, RefreshCw, Copy, Eye, Search, Minus, Plus, X } from "lucide-react";

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
    producto: { nombre: string; activo?: boolean; categoria?: { nombre: string } };
  }>;
}

const RANGOS = [
  { value: "SIN_ESPECIFICAR", label: "Sin especificar" },
  { value: "H5_6", label: "5–6 hs" },
  { value: "H7_8", label: "7–8 hs" },
  { value: "H9_10", label: "9–10 hs" },
  { value: "H10_12", label: "10–12 hs" },
  { value: "H12_14", label: "12–14 hs" },
  { value: "H14_16", label: "14–16 hs" },
  { value: "H16_18", label: "16–18 hs" },
];

function getFechaMinimaString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
function getFechaMaximaString() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

function NuevoPedidoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repetirId = searchParams.get("repetir");

  const [paso, setPaso] = useState<1 | 2>(1);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [rangoHorario, setRangoHorario] = useState("SIN_ESPECIFICAR");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoRepetir, setCargandoRepetir] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advertencias, setAdvertencias] = useState<string[]>([]);
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState<PedidoHistorico[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [previewPedido, setPreviewPedido] = useState<PedidoHistorico | null>(null);

  // Load from URL param ?repetir=ID
  useEffect(() => {
    if (repetirId) {
      setCargandoRepetir(true);
      fetch(`/api/cliente/pedidos/${repetirId}`)
        .then(r => r.json())
        .then(json => {
          if (json.data) {
            const pedido = json.data;
            const warns: string[] = [];
            const items: ItemCarrito[] = (pedido.items ?? [])
              .filter((item: { productoId: string; cantidad: number; precioUnitario: number; producto?: { nombre: string; activo?: boolean } }) => {
                if (item.producto && item.producto.activo === false) {
                  warns.push(`"${item.producto.nombre}" ya no está disponible y fue omitido.`);
                  return false;
                }
                return true;
              })
              .map((item: { productoId: string; cantidad: number; precioUnitario: number; producto?: { nombre: string; categoria?: { nombre: string } } }) => ({
                productoId: item.productoId,
                nombre: item.producto?.nombre ?? item.productoId,
                precio: Number(item.precioUnitario),
                cantidad: item.cantidad,
                categoria: item.producto?.categoria?.nombre,
              }));
            setCarrito(items);
            setRangoHorario(pedido.rangoHorario ?? "SIN_ESPECIFICAR");
            setAdvertencias(warns);
          }
        })
        .catch(() => setError("No se pudo cargar el pedido anterior."))
        .finally(() => setCargandoRepetir(false));
    } else {
      // sessionStorage fallback (keep compatibility)
      try {
        const guardado = sessionStorage.getItem("tammy_carrito_inicial");
        if (guardado) {
          setCarrito(JSON.parse(guardado));
          sessionStorage.removeItem("tammy_carrito_inicial");
        }
      } catch { /* ignore */ }
    }
  }, [repetirId]);

  async function abrirHistorial() {
    setShowHistorial(true);
    setPreviewPedido(null);
    setBusquedaHistorial("");
    setCargandoHistorial(true);
    try {
      const res = await fetch("/api/cliente/pedidos");
      const json = await res.json();
      setHistorial(((json.data ?? []) as PedidoHistorico[]).filter((p) => p.estado !== "CANCELADO"));
    } finally {
      setCargandoHistorial(false);
    }
  }

  function setPreviewCantidad(productoId: string, cantidad: number) {
    setPreviewPedido((prev) => {
      if (!prev) return prev;
      const items = cantidad <= 0
        ? prev.items.filter((i) => i.productoId !== productoId)
        : prev.items.map((i) => i.productoId === productoId ? { ...i, cantidad } : i);
      return { ...prev, items };
    });
  }

  async function confirmarRepetir(pedido: PedidoHistorico) {
    const res = await fetch("/api/productos?activos=true&limit=200");
    const json = await res.json();
    const catalogo: Array<{ id: string; nombre: string; precio: number; categoria?: { nombre: string } }> = json.data ?? [];
    const warns: string[] = [];
    const items: ItemCarrito[] = [];
    for (const item of pedido.items) {
      const prod = catalogo.find((p) => p.id === item.productoId);
      if (!prod) {
        warns.push(`"${item.producto.nombre}" ya no está disponible y fue omitido.`);
        continue;
      }
      items.push({
        productoId: prod.id,
        nombre: prod.nombre,
        precio: Number(prod.precio),
        cantidad: item.cantidad,
        categoria: prod.categoria?.nombre,
      });
    }
    setCarrito(items);
    if (pedido.notas) setNotas(pedido.notas);
    if (pedido.rangoHorario) setRangoHorario(pedido.rangoHorario);
    setAdvertencias(warns);
    setShowHistorial(false);
    setPreviewPedido(null);
  }

  const historialFiltrado = historial.filter((p) => {
    const q = busquedaHistorial.toLowerCase().trim();
    if (!q) return true;
    const productos = p.items.map((i) => `${i.producto.nombre} ${i.producto.categoria?.nombre ?? ""}`).join(" ");
    return `${p.notas ?? ""} ${formatDate(p.fechaEntrega)} ${productos}`.toLowerCase().includes(q);
  });

  async function confirmar() {
    if (!fechaEntrega) { setError("Seleccioná una fecha de entrega."); return; }
    if (carrito.length === 0) { setError("Agregá al menos un producto."); return; }
    setError(null);
    setLoading(true);

    const res = await fetch("/api/cliente/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: carrito.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
        fechaEntrega,
        rangoHorario,
        notas: notas || undefined,
      }),
    });

    setLoading(false);
    if (res.ok) {
      const json = await res.json();
      router.push(`/cliente/pedidos/${json.data.id}`);
    } else {
      const json = await res.json();
      setError(json.error ?? "Error al crear el pedido. Intentá nuevamente.");
    }
  }

  if (cargandoRepetir) {
    return <div className="py-20 text-center text-gray-400 text-sm">Cargando pedido anterior...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => showHistorial ? setShowHistorial(false) : paso === 1 ? router.back() : setPaso(1)} className="p-2 hover:bg-pink-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="min-w-0 flex-1">
          {repetirId ? (
            <>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-violet-500" />
                <h1 className="text-xl font-bold text-gray-900">Repetir Pedido</h1>
              </div>
              <p className="text-xs text-gray-400">Productos pre-cargados · elegí nueva fecha</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900">{showHistorial ? "Repetir un pedido anterior" : "Nuevo Pedido"}</h1>
              <p className="text-xs text-gray-400">{showHistorial ? "Buscá, previsualizá y confirmá" : `Paso ${paso} de 2`}</p>
            </>
          )}
        </div>
        {paso === 1 && !repetirId && (
          <button
            type="button"
            onClick={() => showHistorial ? setShowHistorial(false) : abrirHistorial()}
            className="flex items-center gap-2 rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm font-medium text-pink-700 hover:bg-pink-50"
          >
            <Copy className="h-4 w-4" />
            {showHistorial ? "Catálogo" : "Repetir"}
          </button>
        )}
      </div>

      {/* Advertencias de productos descontinuados */}
      {advertencias.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 space-y-1">
          <p className="font-medium">Atención:</p>
          {advertencias.map((w, i) => <p key={i}>• {w}</p>)}
        </div>
      )}

      {/* Progress */}
      <div className="flex gap-2">
        <div className={`flex-1 h-1.5 rounded-full ${paso >= 1 ? "bg-pink-500" : "bg-gray-200"}`} />
        <div className={`flex-1 h-1.5 rounded-full ${paso >= 2 ? "bg-pink-500" : "bg-gray-200"}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
        {/* Main form */}
        <div className="space-y-5">
          {paso === 1 && showHistorial && (
            <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={busquedaHistorial}
                  onChange={(e) => setBusquedaHistorial(e.target.value)}
                  placeholder="Buscar por fecha, notas, producto o categoría..."
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
              <div className="max-h-[520px] overflow-y-auto rounded-xl border border-gray-100">
                {cargandoHistorial ? (
                  <p className="py-12 text-center text-sm text-gray-400">Cargando historial...</p>
                ) : historialFiltrado.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-400">No hay pedidos anteriores</p>
                ) : (
                  historialFiltrado.map((p) => {
                    const unidades = p.items.reduce((s, i) => s + i.cantidad, 0);
                    return (
                      <div key={p.id} className={`flex items-center gap-2 border-b border-gray-50 px-3 py-2 ${previewPedido?.id === p.id ? "bg-pink-50" : "hover:bg-gray-50"}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{formatDate(p.fechaEntrega)} · {unidades} postres</p>
                          <p className="truncate text-xs text-gray-500">
                            {p.notas ? `📝 ${p.notas}` : ""} · {formatCurrency(Number(p.montoTotal))}
                          </p>
                        </div>
                        <button type="button" className="rounded-lg p-1.5 text-gray-400 hover:bg-pink-50 hover:text-pink-600" title="Previsualizar" onClick={() => setPreviewPedido(p)}>
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {paso === 1 && !showHistorial && (
            <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">
                1. {repetirId ? "Revisá y editá los productos" : "Seleccioná los productos"}
              </h2>
              <SelectorProductos carrito={carrito} onCambio={setCarrito} />
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => { if (carrito.length === 0) { setError("Agregá al menos un producto."); return; } setError(null); setPaso(2); }}
                  className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Siguiente <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5 space-y-5">
              <h2 className="font-semibold text-gray-900">2. Fecha y horario de entrega</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de entrega * {repetirId && <span className="text-xs text-amber-600">(obligatorio elegir nueva fecha)</span>}
                </label>
                <input
                  type="date"
                  value={fechaEntrega}
                  min={getFechaMinimaString()}
                  max={getFechaMaximaString()}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas / observaciones</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  placeholder="Ej: dejar en recepción, agregar cinta..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPaso(1)}
                  className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Anterior
                </button>
                <button
                  onClick={confirmar}
                  disabled={loading}
                  className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  <Check className="h-4 w-4" />
                  {loading ? "Confirmando..." : "Confirmar pedido"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Resumen / preview */}
        <div>
          {showHistorial ? (
            <div className="sticky top-20 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-semibold text-gray-900">
                {previewPedido
                  ? `Preview · ${formatDate(previewPedido.fechaEntrega)}${previewPedido.notas ? ` · ${previewPedido.notas}` : ""}`
                  : "Preview"}
              </h3>
              {!previewPedido ? (
                <p className="py-8 text-center text-sm text-gray-400">Tocá el ojito para previsualizar un pedido</p>
              ) : (
                <>
                  <div className="mb-4 max-h-[420px] space-y-3 overflow-y-auto">
                    {previewPedido.items.map((item) => (
                      <div key={item.productoId} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 w-24 shrink-0 truncate rounded-full bg-pink-100 px-2 py-0.5 text-center text-[10px] font-semibold text-pink-800">
                          {item.producto.categoria?.nombre ?? "Sin categoría"}
                        </span>
                        <p className="min-w-0 flex-1 break-words leading-snug text-gray-800">{item.producto.nombre}</p>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200" onClick={() => setPreviewCantidad(item.productoId, item.cantidad - 1)}>
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={item.cantidad}
                            onChange={(e) => setPreviewCantidad(item.productoId, parseInt(e.target.value) || 0)}
                            className="h-7 w-12 rounded-lg border border-pink-300 bg-pink-50 text-center text-sm font-semibold"
                          />
                          <button type="button" className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200" onClick={() => setPreviewCantidad(item.productoId, item.cantidad + 1)}>
                            <Plus className="h-3 w-3" />
                          </button>
                          <button type="button" className="text-gray-400 hover:text-red-500" onClick={() => setPreviewCantidad(item.productoId, 0)}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <div className="mb-2 flex justify-between text-sm font-semibold text-gray-800">
                      <span>Total postres</span>
                      <span>{previewPedido.items.reduce((s, i) => s + i.cantidad, 0)}</span>
                    </div>
                    <p className="mb-3 text-xs text-gray-500">Se cargará con los precios actuales. Confirmá para copiarlo al pedido.</p>
                    <button
                      type="button"
                      disabled={previewPedido.items.length === 0}
                      onClick={() => confirmarRepetir(previewPedido)}
                      className="w-full rounded-xl bg-pink-600 py-3 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
                    >
                      Confirmar y usar este pedido
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <ResumenPedido
              items={carrito}
              fechaEntrega={fechaEntrega}
              rangoHorario={rangoHorario}
              onCambio={setCarrito}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function NuevoPedidoPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400 text-sm">Cargando...</div>}>
      <NuevoPedidoInner />
    </Suspense>
  );
}
