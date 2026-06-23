"use client";

import { formatCurrency } from "@/lib/utils";

export interface ItemCarrito {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

interface ResumenPedidoProps {
  items: ItemCarrito[];
  fechaEntrega?: string;
  rangoHorario?: string;
  onConfirmar?: () => void;
  loading?: boolean;
  ctaLabel?: string;
}

export default function ResumenPedido({
  items,
  fechaEntrega,
  rangoHorario,
  onConfirmar,
  loading,
  ctaLabel = "Confirmar pedido",
}: ResumenPedidoProps) {
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const totalItems = items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <div className="bg-white border border-pink-100 rounded-2xl shadow-sm p-5 sticky top-20">
      <h3 className="font-semibold text-gray-900 mb-4">Resumen del pedido</h3>

      {items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">Todavía no agregaste productos</p>
      ) : (
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.productoId} className="flex justify-between text-sm">
              <span className="text-gray-700 truncate flex-1">
                <span className="font-medium text-pink-600">{item.cantidad}×</span> {item.nombre}
              </span>
              <span className="font-medium text-gray-900 ml-2 flex-shrink-0">
                {formatCurrency(item.precio * item.cantidad)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-3 space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Cantidad total</span>
          <span>{totalItems} unidades</span>
        </div>
        {fechaEntrega && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Fecha entrega</span>
            <span>{new Date(fechaEntrega).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
          </div>
        )}
        {rangoHorario && rangoHorario !== "SIN_ESPECIFICAR" && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Horario</span>
            <span>{rangoHorario.replace("H", "").replace("_", "–")} hs</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100 mt-2">
          <span>Total</span>
          <span className="text-pink-600">{formatCurrency(total)}</span>
        </div>
      </div>

      {onConfirmar && (
        <button
          onClick={onConfirmar}
          disabled={items.length === 0 || loading}
          className="mt-4 w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          {loading ? "Procesando..." : ctaLabel}
        </button>
      )}
    </div>
  );
}
