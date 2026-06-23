"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { DollarSign, ArrowRight } from "lucide-react";

interface DeudaFactura {
  facturaId: string;
  numero: number;
  fecha: string;
  montoTotal: number;
  saldo: number;
  diasSinPagar: number;
  semaforo: "rojo" | "naranja" | "amarillo" | "verde";
  estado: string;
}

const SEMAFORO: Record<string, { dot: string; badge: string; label: string }> = {
  rojo: { dot: "bg-red-500", badge: "bg-red-100 text-red-700", label: "Vencida" },
  naranja: { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700", label: "En mora" },
  amarillo: { dot: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-700", label: "Próxima" },
  verde: { dot: "bg-green-500", badge: "bg-green-100 text-green-700", label: "Al día" },
};

export default function MiDeudaPage() {
  const [deudaTotal, setDeudaTotal] = useState(0);
  const [facturas, setFacturas] = useState<DeudaFactura[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/cliente/deuda")
      .then((r) => r.json())
      .then((j) => {
        setDeudaTotal(j.deudaTotal ?? 0);
        setFacturas(j.porFactura ?? []);
        setCargando(false);
      });
  }, []);

  if (cargando) return <p className="text-center text-gray-400 py-20">Cargando...</p>;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <DollarSign className="h-6 w-6 text-pink-600" />
        <h1 className="text-2xl font-bold text-gray-900">Mi Deuda</h1>
      </div>

      {/* Total */}
      <div className={`rounded-2xl shadow-sm p-6 ${deudaTotal > 0 ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
        <p className="text-sm font-medium text-gray-500 mb-1">Deuda total pendiente</p>
        <p className={`text-4xl font-bold ${deudaTotal > 0 ? "text-orange-600" : "text-green-600"}`}>
          {deudaTotal > 0 ? formatCurrency(deudaTotal) : "Sin deuda 🎉"}
        </p>
        {deudaTotal === 0 && (
          <p className="text-sm text-green-600 mt-1">Todas tus facturas están al día.</p>
        )}
      </div>

      {/* Legend */}
      {deudaTotal > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(SEMAFORO).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
              {v.label}
            </div>
          ))}
        </div>
      )}

      {/* Facturas pendientes */}
      {facturas.length > 0 && (
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
          <h2 className="font-semibold text-gray-900 px-5 py-4 border-b border-gray-50">Desglose por factura</h2>
          <div>
            {facturas.map((f) => {
              const s = SEMAFORO[f.semaforo];
              return (
                <div key={f.facturaId} className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-pink-50/30 transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">Factura #{f.numero}</p>
                    <p className="text-xs text-gray-400">{formatDate(f.fecha)} · {f.diasSinPagar} días sin pagar</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(f.saldo)}</p>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Link
        href="/cliente/facturas"
        className="flex items-center gap-2 text-sm text-pink-600 font-medium hover:underline"
      >
        Ver todas las facturas <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
