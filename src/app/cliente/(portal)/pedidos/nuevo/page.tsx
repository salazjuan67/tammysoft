"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SelectorProductos from "@/components/cliente/SelectorProductos";
import ResumenPedido, { type ItemCarrito } from "@/components/cliente/ResumenPedido";
import { ArrowLeft, ArrowRight, Check, RefreshCw } from "lucide-react";

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
              .map((item: { productoId: string; cantidad: number; precioUnitario: number; producto?: { nombre: string } }) => ({
                productoId: item.productoId,
                nombre: item.producto?.nombre ?? item.productoId,
                precio: Number(item.precioUnitario),
                cantidad: item.cantidad,
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
        <button onClick={() => paso === 1 ? router.back() : setPaso(1)} className="p-2 hover:bg-pink-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
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
              <h1 className="text-xl font-bold text-gray-900">Nuevo Pedido</h1>
              <p className="text-xs text-gray-400">Paso {paso} de 2</p>
            </>
          )}
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-5">
          {paso === 1 && (
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rango horario</label>
                  <select
                    value={rangoHorario}
                    onChange={(e) => setRangoHorario(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
                  >
                    {RANGOS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
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

        {/* Resumen siempre visible */}
        <div>
          <ResumenPedido
            items={carrito}
            fechaEntrega={fechaEntrega}
            rangoHorario={rangoHorario}
          />
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
