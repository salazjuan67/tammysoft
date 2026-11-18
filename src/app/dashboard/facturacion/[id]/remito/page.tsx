"use client";

import { useEffect, useRef, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer } from "lucide-react";

interface RemitoData {
  id: string;
  numero: number;
  fecha: string;
  montoTotal: string | number;
  estado: string;
  totalPagado: number;
  saldoPendiente: number;
  cliente: { nombre: string; telefono: string | null; direccion: string | null };
  pedido: {
    fechaEntrega: string;
    notas: string | null;
    items: {
      id: string;
      cantidad: number;
      precioUnitario: string | number;
      subtotal: string | number;
      producto: { nombre: string };
    }[];
  } | null;
}

export default function RemitoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<RemitoData | null>(null);
  const [error, setError] = useState("");
  const impreso = useRef(false);

  useEffect(() => {
    fetch(`/api/facturas/${id}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "No se pudo cargar el remito");
        setData(json.data);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (data && !impreso.current) {
      impreso.current = true;
      setTimeout(() => window.print(), 300);
    }
  }, [data]);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!data) return <p className="text-gray-400 text-sm">Cargando remito...</p>;

  const numero = `R-${String(data.numero).padStart(5, "0")}`;
  const total = Number(data.montoTotal);

  return (
    <div>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body * { visibility: hidden; }
          #remito, #remito * { visibility: visible; }
          #remito { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="mb-4 flex justify-end print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <div id="remito" className="mx-auto max-w-3xl bg-white p-8 text-sm text-gray-900 border border-gray-200 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4">
          <div>
            <h1 className="text-2xl font-bold">Postres Tammy Light</h1>
            <p className="text-xs text-gray-500 mt-1">Documento no válido como factura</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">REMITO {numero}</p>
            <p className="text-gray-600">Fecha: {formatDate(data.fecha)}</p>
            {data.pedido && <p className="text-gray-600">Entrega: {formatDate(data.pedido.fechaEntrega)}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-b border-gray-300">
          <div>
            <p className="text-xs uppercase text-gray-500">Cliente</p>
            <p className="font-semibold">{data.cliente.nombre}</p>
            {data.cliente.direccion && <p>{data.cliente.direccion}</p>}
            {data.cliente.telefono && <p>Tel: {data.cliente.telefono}</p>}
          </div>
          {data.pedido?.notas && (
            <div>
              <p className="text-xs uppercase text-gray-500">Cliente final / Notas</p>
              <p className="font-medium">{data.pedido.notas}</p>
            </div>
          )}
        </div>

        <table className="w-full mt-4">
          <thead>
            <tr className="border-b border-gray-900 text-left">
              <th className="py-2 w-20">Cant.</th>
              <th className="py-2">Producto</th>
              <th className="py-2 text-right">P. unitario</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(data.pedido?.items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-2">{item.cantidad}</td>
                <td className="py-2">{item.producto.nombre}</td>
                <td className="py-2 text-right">{formatCurrency(Number(item.precioUnitario))}</td>
                <td className="py-2 text-right">{formatCurrency(Number(item.subtotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-72 space-y-1">
          <div className="flex justify-between font-semibold">
            <span>Total del pedido</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {data.totalPagado > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Cobrado</span>
              <span>{formatCurrency(data.totalPagado)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-gray-900 pt-1 text-lg font-bold">
            <span>Total a cobrar</span>
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
