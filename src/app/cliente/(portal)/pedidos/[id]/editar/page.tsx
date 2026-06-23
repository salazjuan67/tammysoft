"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import SelectorProductos from "@/components/cliente/SelectorProductos";
import ResumenPedido, { type ItemCarrito } from "@/components/cliente/ResumenPedido";
import MensajeEdicionNoDisponible from "@/components/cliente/MensajeEdicionNoDisponible";
import { ArrowLeft, Clock, Save } from "lucide-react";
import type { ValidacionEdicion } from "@/lib/validarEdicion";

interface PedidoDetalle {
  id: string;
  estado: string;
  fechaEntrega: string;
  rangoHorario: string;
  notas: string | null;
  montoTotal: number;
  items: { productoId: string; cantidad: number; precioUnitario: number; producto: { nombre: string } }[];
  validacion: ValidacionEdicion;
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
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
function getFechaMaximaString() {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export default function EditarPedidoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [rangoHorario, setRangoHorario] = useState("SIN_ESPECIFICAR");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarPedido = useCallback(async () => {
    const res = await fetch(`/api/cliente/pedidos/${id}`);
    const json = await res.json();
    if (!res.ok || !json.data) { setCargando(false); return; }

    const p: PedidoDetalle = json.data;
    setPedido(p);

    // Pre-populate form
    setFechaEntrega(new Date(p.fechaEntrega).toISOString().split("T")[0]);
    setRangoHorario(p.rangoHorario);
    setNotas(p.notas ?? "");
    setCarrito(
      p.items.map((i) => ({
        productoId: i.productoId,
        nombre: i.producto.nombre,
        precio: Number(i.precioUnitario),
        cantidad: i.cantidad,
      }))
    );
    setCargando(false);
  }, [id]);

  useEffect(() => { cargarPedido(); }, [cargarPedido]);

  async function guardar() {
    if (!fechaEntrega) { setError("Seleccioná una fecha de entrega."); return; }
    if (carrito.length === 0) { setError("Agregá al menos un producto."); return; }
    setError(null);
    setGuardando(true);

    const res = await fetch(`/api/cliente/pedidos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: carrito.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
        fechaEntrega,
        rangoHorario,
        notas: notas || undefined,
      }),
    });

    setGuardando(false);
    if (res.ok) {
      router.push(`/cliente/pedidos/${id}`);
    } else {
      const j = await res.json();
      setError(j.error ?? "Error al guardar los cambios.");
    }
  }

  if (cargando) return <p className="text-center text-gray-400 py-20">Cargando...</p>;
  if (!pedido) return <p className="text-center text-gray-400 py-20">Pedido no encontrado.</p>;

  // Block if can't edit
  if (!pedido.validacion?.puede_editar) {
    return (
      <div className="max-w-lg mx-auto space-y-5 pt-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-pink-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Editar pedido</h1>
        </div>
        <MensajeEdicionNoDisponible
          motivo={pedido.validacion?.motivo ?? null}
          limite={pedido.validacion?.limite ? String(pedido.validacion.limite) : null}
          estado={pedido.estado}
        />
        <button onClick={() => router.back()} className="text-sm text-pink-600 hover:underline">
          ← Volver al pedido
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-pink-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Editar Pedido #{pedido.id.slice(-6).toUpperCase()}</h1>
          <p className="text-xs text-gray-400">Podés modificar productos, fecha y horario</p>
        </div>
      </div>

      {/* Edit window info */}
      {pedido.validacion.limite && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Tiempo para editar hasta:{" "}
            <strong>
              {new Date(pedido.validacion.limite).toLocaleString("es-AR", {
                weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </strong>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: products + date */}
        <div className="lg:col-span-2 space-y-5">
          {/* Products */}
          <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Productos</h2>
            <SelectorProductos carrito={carrito} onCambio={setCarrito} />
          </div>

          {/* Date / time / notes */}
          <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Fecha y horario</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de entrega *</label>
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
                  {RANGOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                placeholder="Observaciones adicionales..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <Save className="h-4 w-4" />
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              onClick={() => router.back()}
              className="border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>

        {/* Right: Resumen */}
        <div>
          <ResumenPedido items={carrito} fechaEntrega={fechaEntrega} rangoHorario={rangoHorario} />
        </div>
      </div>
    </div>
  );
}
