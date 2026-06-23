"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import MensajeEdicionNoDisponible from "@/components/cliente/MensajeEdicionNoDisponible";
import { ArrowLeft, Pencil, XCircle, Clock, Printer } from "lucide-react";
import type { ValidacionEdicion } from "@/lib/validarEdicion";

interface PedidoDetalle {
  id: string;
  estado: string;
  fechaEntrega: string;
  rangoHorario: string;
  notas: string | null;
  montoTotal: number;
  createdAt: string;
  items: {
    id: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    producto: { nombre: string; categoria: { nombre: string } };
  }[];
  factura?: { id: string; numero: number; estado: string; montoTotal: number } | null;
  validacion: ValidacionEdicion;
}

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700",
  EN_PRODUCCION: "bg-blue-100 text-blue-700",
  ENTREGADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};

export default function DetallePedidoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    fetch(`/api/cliente/pedidos/${id}`)
      .then((r) => r.json())
      .then((j) => { setPedido(j.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [id]);

  async function cancelar() {
    if (!confirm("¿Estás seguro que querés cancelar este pedido?")) return;
    setCancelando(true);
    const res = await fetch(`/api/cliente/pedidos/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/cliente/pedidos");
    } else {
      const j = await res.json();
      setError(j.error);
      setCancelando(false);
    }
  }

  if (cargando) return <p className="text-center text-gray-400 py-20">Cargando...</p>;
  if (!pedido) return <p className="text-center text-gray-400 py-20">Pedido no encontrado.</p>;

  const puede = pedido.validacion?.puede_editar;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/cliente/pedidos" className="p-2 hover:bg-pink-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Pedido #{pedido.id.slice(-6).toUpperCase()}</h1>
          <p className="text-xs text-gray-400">Creado el {formatDate(pedido.createdAt)}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${ESTADO_BADGE[pedido.estado]}`}>
          {pedido.estado.replace("_", " ")}
        </span>
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Fecha de entrega</span>
          <span className="font-medium text-gray-800">{formatDate(pedido.fechaEntrega)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Rango horario</span>
          <span className="font-medium text-gray-800">
            {pedido.rangoHorario === "SIN_ESPECIFICAR" ? "Sin especificar" : pedido.rangoHorario.replace("H", "").replace("_", "–") + " hs"}
          </span>
        </div>
        {pedido.notas && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Notas</span>
            <span className="font-medium text-gray-800 text-right max-w-[60%]">{pedido.notas}</span>
          </div>
        )}
        {pedido.factura && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Factura</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pedido.factura.estado === "COBRADA" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
              #{pedido.factura.numero} · {pedido.factura.estado}
            </span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
        <h2 className="font-semibold text-gray-900 px-5 py-4 border-b border-gray-50">Productos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-xs text-gray-500 uppercase">
                <th className="text-left px-4 py-2">Producto</th>
                <th className="text-right px-4 py-2">Cant.</th>
                <th className="text-right px-4 py-2">Precio</th>
                <th className="text-right px-4 py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {pedido.items.map((item) => (
                <tr key={item.id} className="border-t border-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{item.producto.nombre}</p>
                    <p className="text-xs text-gray-400">{item.producto.categoria.nombre}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.cantidad}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(Number(item.precioUnitario))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(Number(item.subtotal))}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-200 bg-pink-50/50">
                <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900">Total</td>
                <td className="px-4 py-3 text-right font-bold text-pink-600 text-base">{formatCurrency(Number(pedido.montoTotal))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit window info */}
      {pedido.estado === "PENDIENTE" && (
        <>
          {puede ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Clock className="h-4 w-4 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700">Podés editar este pedido</p>
                {pedido.validacion.limite && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Hasta:{" "}
                    {new Date(pedido.validacion.limite).toLocaleString("es-AR", {
                      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <MensajeEdicionNoDisponible
              motivo={pedido.validacion.motivo}
              limite={pedido.validacion.limite ? String(pedido.validacion.limite) : null}
              estado={pedido.estado}
            />
          )}
        </>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Printer className="h-4 w-4" /> Imprimir
        </button>
        {pedido.estado === "PENDIENTE" && puede && (
          <Link
            href={`/cliente/pedidos/${id}/editar`}
            className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            <Pencil className="h-4 w-4" /> Editar pedido
          </Link>
        )}
        {pedido.estado === "PENDIENTE" && (
          <button
            onClick={cancelar}
            disabled={cancelando}
            className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            <XCircle className="h-4 w-4" />
            {cancelando ? "Cancelando..." : "Cancelar pedido"}
          </button>
        )}
      </div>
    </div>
  );
}
