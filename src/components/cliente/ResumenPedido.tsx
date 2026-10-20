"use client";

import { formatCurrency } from "@/lib/utils";
import { Minus, Plus, X } from "lucide-react";

export interface ItemCarrito {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  categoria?: string;
}

interface ResumenPedidoProps {
  items: ItemCarrito[];
  fechaEntrega?: string;
  rangoHorario?: string;
  onCambio?: (items: ItemCarrito[]) => void;
  onConfirmar?: () => void;
  loading?: boolean;
  ctaLabel?: string;
}

export default function ResumenPedido({
  items,
  fechaEntrega,
  rangoHorario,
  onCambio,
  onConfirmar,
  loading,
  ctaLabel = "Confirmar pedido",
}: ResumenPedidoProps) {
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const totalItems = items.reduce((s, i) => s + i.cantidad, 0);

  function setCantidad(productoId: string, cantidad: number) {
    if (!onCambio) return;
    if (cantidad <= 0) {
      onCambio(items.filter((i) => i.productoId !== productoId));
      return;
    }
    onCambio(items.map((i) => i.productoId === productoId ? { ...i, cantidad } : i));
  }

  return (
    <div className="bg-white border border-pink-100 rounded-2xl shadow-sm p-5 sticky top-20">
      <h3 className="font-semibold text-gray-900 mb-4">Resumen del pedido</h3>

      {items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">Todavía no agregaste productos</p>
      ) : (
        <div className="space-y-3 mb-4 max-h-[420px] overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.productoId} className="flex items-start gap-2 text-sm">
              {item.categoria && (
                <span className="mt-0.5 w-24 shrink-0 truncate rounded-full bg-pink-100 px-2 py-0.5 text-center text-[10px] font-semibold text-pink-800">
                  {item.categoria}
                </span>
              )}
              <p className="min-w-0 flex-1 break-words leading-snug text-gray-800">{item.nombre}</p>
              <div className="flex shrink-0 items-center gap-1">
                {onCambio && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCantidad(item.productoId, item.cantidad - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-pink-400 hover:text-pink-600"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={item.cantidad}
                      onChange={(e) => setCantidad(item.productoId, parseInt(e.target.value) || 0)}
                      className="h-7 w-12 rounded-lg border border-pink-300 bg-pink-50 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                    <button
                      type="button"
                      onClick={() => setCantidad(item.productoId, item.cantidad + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-pink-400 hover:text-pink-600"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </>
                )}
                {!onCambio && (
                  <span className="font-medium text-pink-600">{item.cantidad}×</span>
                )}
                <span className="w-16 text-right font-medium text-gray-900">
                  {formatCurrency(item.precio * item.cantidad)}
                </span>
                {onCambio && (
                  <button
                    type="button"
                    onClick={() => setCantidad(item.productoId, 0)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label="Quitar"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-3 space-y-1">
        <div className="flex justify-between text-sm font-semibold text-gray-800">
          <span>Total productos</span>
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
