"use client";

import { useEffect, useRef, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer } from "lucide-react";

interface NcPrintData {
  id: string;
  numero: number;
  montoTotal: string | number;
  montoACobrar: number;
  totalCreditos: number;
  saldoPendiente: number;
  cliente: { nombre: string; telefono: string | null; direccion?: string | null };
  notasCredito: {
    id: string;
    numero: number;
    monto: number;
    motivo: string | null;
    fecha: string;
    comprobanteArca: string | null;
  }[];
}

export default function NotaCreditoPrintPage({
  params,
}: {
  params: Promise<{ id: string; ncId: string }>;
}) {
  const { id, ncId } = use(params);
  const [data, setData] = useState<NcPrintData | null>(null);
  const [error, setError] = useState("");
  const impreso = useRef(false);

  useEffect(() => {
    fetch(`/api/facturas/${id}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "No se pudo cargar");
        setData(json.data);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const nota = data?.notasCredito?.find((n) => n.id === ncId) ?? null;

  useEffect(() => {
    if (data && nota && !impreso.current) {
      impreso.current = true;
      setTimeout(() => window.print(), 300);
    }
  }, [data, nota]);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!data || !nota) return <p className="text-gray-400 text-sm">Cargando nota de crédito...</p>;

  return (
    <div>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body * { visibility: hidden; }
          #nc, #nc * { visibility: visible; }
          #nc { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="mb-4 flex justify-end print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <div id="nc" className="mx-auto max-w-3xl bg-white p-8 text-sm text-gray-900 border border-gray-200 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4">
          <div>
            <h1 className="text-2xl font-bold">Postres Tammy Light</h1>
            <p className="text-xs text-gray-500 mt-1">Nota de crédito</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">NC-{String(nota.numero).padStart(5, "0")}</p>
            <p className="text-gray-600">Fecha: {formatDate(nota.fecha)}</p>
            <p className="text-gray-600">Factura: FAC-{String(data.numero).padStart(5, "0")}</p>
          </div>
        </div>

        <div className="py-4 border-b border-gray-300">
          <p className="text-xs uppercase text-gray-500">Cliente</p>
          <p className="font-semibold">{data.cliente.nombre}</p>
          {data.cliente.direccion && <p>{data.cliente.direccion}</p>}
          {data.cliente.telefono && <p>Tel: {data.cliente.telefono}</p>}
        </div>

        <div className="py-6 space-y-2">
          <div className="flex justify-between text-base">
            <span>Monto acreditado</span>
            <span className="font-bold text-lg">{formatCurrency(nota.monto)}</span>
          </div>
          {nota.motivo && (
            <div>
              <p className="text-xs uppercase text-gray-500">Motivo</p>
              <p>{nota.motivo}</p>
            </div>
          )}
          {nota.comprobanteArca && (
            <div>
              <p className="text-xs uppercase text-gray-500">Comprobante ARCA</p>
              <p className="font-mono">{nota.comprobanteArca}</p>
            </div>
          )}
        </div>

        <div className="mt-4 ml-auto w-72 space-y-1 text-sm border-t border-gray-300 pt-3">
          <div className="flex justify-between text-gray-600">
            <span>Total facturado (base)</span>
            <span>{formatCurrency(Number(data.montoTotal))}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Notas de crédito</span>
            <span>− {formatCurrency(data.totalCreditos)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Saldo pendiente</span>
            <span>{formatCurrency(data.saldoPendiente)}</span>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-12">
          <div className="border-t border-gray-900 pt-1 text-center text-xs text-gray-600">Firma</div>
          <div className="border-t border-gray-900 pt-1 text-center text-xs text-gray-600">Aclaración</div>
        </div>
      </div>
    </div>
  );
}
