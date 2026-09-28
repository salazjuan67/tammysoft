"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";

interface ClienteRow {
  clienteNombre: string;
  cantidadPedidos: number;
  montoTotal: number;
  efectivoCobrado: number;
  transferenciaCobrada: number;
  ivaTotal: number;
  saldoPendiente: number;
}

interface Distribuidor {
  id: string;
  nombre: string;
  clientes: Record<string, ClienteRow>;
  totales: ClienteRow;
}

export default function ReporteDistribuidoresPage() {
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    if (clienteId) params.set("clienteId", clienteId);
    const res = await fetch(`/api/reportes/distribuidores?${params}`);
    const json = await res.json();
    setDistribuidores(json.data ?? []);
    setClientes(json.clientes ?? []);
    setLoading(false);
  }, [desde, hasta, clienteId]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalesGenerales = distribuidores.reduce(
    (acc, d) => ({
      cantidadPedidos: acc.cantidadPedidos + d.totales.cantidadPedidos,
      montoTotal: acc.montoTotal + d.totales.montoTotal,
      efectivoCobrado: acc.efectivoCobrado + d.totales.efectivoCobrado,
      transferenciaCobrada: acc.transferenciaCobrada + d.totales.transferenciaCobrada,
      ivaTotal: acc.ivaTotal + d.totales.ivaTotal,
      saldoPendiente: acc.saldoPendiente + d.totales.saldoPendiente,
    }),
    { cantidadPedidos: 0, montoTotal: 0, efectivoCobrado: 0, transferenciaCobrada: 0, ivaTotal: 0, saldoPendiente: 0 }
  );

  function toggleExpandir(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte por Distribuidor</h1>
          <p className="text-gray-500 text-sm">Pedidos, cobros, IVA y saldo por distribuidor y cliente final</p>
        </div>
        <Button variant="outline" onClick={() => handlePrint()}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Distribuidor</label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(desde || hasta || clienteId) && (
              <Button variant="ghost" size="sm" onClick={() => { setDesde(""); setHasta(""); setClienteId(""); }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Totales generales */}
      {!loading && distribuidores.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Pedidos", value: totalesGenerales.cantidadPedidos.toString(), color: "text-gray-900" },
            { label: "Total pedidos", value: formatCurrency(totalesGenerales.montoTotal), color: "text-gray-900" },
            { label: "Efectivo", value: formatCurrency(totalesGenerales.efectivoCobrado), color: "text-green-600" },
            { label: "Transferencia", value: formatCurrency(totalesGenerales.transferenciaCobrada), color: "text-blue-600" },
            { label: "IVA total", value: formatCurrency(totalesGenerales.ivaTotal), color: "text-purple-600" },
            { label: "Saldo pendiente", value: formatCurrency(totalesGenerales.saldoPendiente), color: "text-red-600" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className={`font-bold text-sm mt-0.5 ${item.color}`}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabla por distribuidor */}
      <div ref={printRef}>
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">Reporte por Distribuidor — Postres Tammy Light</h1>
          {(desde || hasta) && <p className="text-sm text-gray-500">{desde && formatDate(desde)}{desde !== hasta && hasta ? ` — ${formatDate(hasta)}` : ""}</p>}
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Cargando reporte...</div>
        ) : distribuidores.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-500">No hay datos para los filtros seleccionados</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {distribuidores.map((dist) => (
              <Card key={dist.id}>
                <CardHeader className="pb-2 bg-pink-50 rounded-t-xl print:bg-white print:border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{dist.nombre}</CardTitle>
                    <button
                      className="text-xs text-gray-500 hover:text-gray-700 no-print"
                      onClick={() => toggleExpandir(dist.id)}
                    >
                      {expandidos.has(dist.id) ? "▲ Ocultar clientes" : "▼ Ver por cliente"}
                    </button>
                  </div>
                  {/* Totales del distribuidor */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2 text-xs text-center">
                    <div><p className="text-gray-400">Pedidos</p><p className="font-bold">{dist.totales.cantidadPedidos}</p></div>
                    <div><p className="text-gray-400">Total</p><p className="font-bold">{formatCurrency(dist.totales.montoTotal)}</p></div>
                    <div><p className="text-gray-400">Efectivo</p><p className="font-bold text-green-600">{formatCurrency(dist.totales.efectivoCobrado)}</p></div>
                    <div><p className="text-gray-400">Transferencia</p><p className="font-bold text-blue-600">{formatCurrency(dist.totales.transferenciaCobrada)}</p></div>
                    <div><p className="text-gray-400">IVA</p><p className="font-bold text-purple-600">{formatCurrency(dist.totales.ivaTotal)}</p></div>
                    <div><p className="text-gray-400">Pendiente</p><p className="font-bold text-red-600">{formatCurrency(dist.totales.saldoPendiente)}</p></div>
                  </div>
                </CardHeader>

                {/* Detalle por cliente final */}
                {(expandidos.has(dist.id) || Object.keys(dist.clientes).length <= 3) && (
                  <CardContent className="pt-3 p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-2 font-medium text-gray-500">Cliente final</th>
                          <th className="text-center px-3 py-2 font-medium text-gray-500">Ped.</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-500">Total</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-500">Efectivo</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-500">Transfer.</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-500">IVA</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-500">Pendiente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(dist.clientes)
                          .sort((a, b) => a.clienteNombre.localeCompare(b.clienteNombre))
                          .map((row) => (
                            <tr key={row.clienteNombre} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-2 font-medium text-gray-800">{row.clienteNombre}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{row.cantidadPedidos}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(row.montoTotal)}</td>
                              <td className="px-3 py-2 text-right text-green-600">{formatCurrency(row.efectivoCobrado)}</td>
                              <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(row.transferenciaCobrada)}</td>
                              <td className="px-3 py-2 text-right text-purple-600">{formatCurrency(row.ivaTotal)}</td>
                              <td className="px-4 py-2 text-right font-semibold text-red-600">{formatCurrency(row.saldoPendiente)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { font-size: 9px !important; }
          .no-print { display: none !important; }
          nav, header, aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}
