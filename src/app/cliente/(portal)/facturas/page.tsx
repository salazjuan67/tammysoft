"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";

interface Factura {
  id: string;
  numero: number;
  fecha: string;
  montoTotal: number;
  estado: string;
  pedido: { fechaEntrega: string };
  pagos: { monto: number }[];
}

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-orange-100 text-orange-700",
  PARCIALMENTE_COBRADA: "bg-yellow-100 text-yellow-700",
  COBRADA: "bg-green-100 text-green-700",
  ANULADA: "bg-gray-100 text-gray-400",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Sin cobrar",
  PARCIALMENTE_COBRADA: "Pago parcial",
  COBRADA: "Cobrada",
  ANULADA: "Anulada",
};

const FILTROS = [
  { value: "", label: "Todas" },
  { value: "sin-cobrar", label: "Sin cobrar" },
  { value: "cobrada", label: "Cobradas" },
  { value: "anulada", label: "Anuladas" },
];

export default function MisFacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [filtro, setFiltro] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const qs = filtro ? `?estado=${filtro}` : "";
    const res = await fetch(`/api/cliente/facturas${qs}`);
    const json = await res.json();
    setFacturas(json.data ?? []);
    setCargando(false);
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-pink-600" />
        <h1 className="text-2xl font-bold text-gray-900">Mis Facturas</h1>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtro === f.value
                ? "bg-pink-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-pink-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
        {cargando ? (
          <p className="text-center text-gray-400 py-12">Cargando...</p>
        ) : facturas.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No hay facturas{filtro ? " con este filtro" : ""}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="text-left px-4 py-3"># Factura</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Fecha</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Entrega pedido</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">Pagado</th>
                  <th className="text-center px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => {
                  const pagado = f.pagos.reduce((s, p) => s + Number(p.monto), 0);
                  const saldo = Number(f.montoTotal) - pagado;
                  return (
                    <tr key={f.id} className="border-b border-gray-50 last:border-0 hover:bg-pink-50/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <div>#{f.numero}</div>
                        {saldo > 0 && f.estado !== "COBRADA" && f.estado !== "ANULADA" && (
                          <div className="text-xs text-orange-500 font-medium">Saldo: {formatCurrency(saldo)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(f.fecha)}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(f.pedido.fechaEntrega)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(Number(f.montoTotal))}</td>
                      <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{formatCurrency(pagado)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_BADGE[f.estado]}`}>
                          {ESTADO_LABEL[f.estado]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
