"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getRangoLabel } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";

interface ItemAgg { producto: string; categoria: string; cantidad: number }
interface PedidoDia {
  id: string;
  notas: string | null;
  estado: string;
  rangoHorario: string;
  fechaEntrega: string;
  totalPostres: number;
  montoTotal: number;
  items: Array<{ nombre: string; cantidad: number; categoria: string }>;
}
interface ClienteDia {
  clienteId: string;
  nombre: string;
  pedidos: PedidoDia[];
  totalPostres: number;
  postresHechos: number;
  postresEnProduccion: number;
  postresPendientes: number;
  montoTotal: number;
  montoHechos: number;
  montoEnProduccion: number;
  montoPendientes: number;
}
interface ReporteDia {
  fecha: string;
  resumen: {
    pedidos: number;
    clientes: number;
    postresTotal: number;
    postresHechos: number;
    postresEnProduccion: number;
    postresPendientes: number;
    montoTotal: number;
    montoHechos: number;
    montoEnProduccion: number;
    montoPendientes: number;
  };
  clientes: ClienteDia[];
  postresHechos: ItemAgg[];
  postresEnProduccion: ItemAgg[];
  postresPendientes: ItemAgg[];
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PRODUCCION: "En producción",
  ENTREGADO: "Hecho / entregado",
};

function hoy() {
  return new Date().toISOString().split("T")[0];
}

function agruparPorCategoria(items: ItemAgg[]) {
  const grupos = new Map<string, ItemAgg[]>();
  for (const item of items) {
    if (!grupos.has(item.categoria)) grupos.set(item.categoria, []);
    grupos.get(item.categoria)!.push(item);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([cat, prods]) => [cat, [...prods].sort((a, b) => a.producto.localeCompare(b.producto, "es"))] as const);
}

function agruparItemsPedido(items: Array<{ nombre: string; cantidad: number; categoria: string }>) {
  const grupos = new Map<string, typeof items>();
  for (const item of items) {
    const cat = item.categoria || "Sin categoría";
    if (!grupos.has(cat)) grupos.set(cat, []);
    grupos.get(cat)!.push(item);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([categoria, prods]) => ({
      categoria,
      items: [...prods].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    }));
}

export default function ReporteDiaPage() {
  const [fecha, setFecha] = useState(hoy);
  const [vista, setVista] = useState<"general" | "detalle">("general");
  const [data, setData] = useState<ReporteDia | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const cargar = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reportes/dia?fecha=${fecha}`);
    const json = await res.json();
    setData(json.data ?? null);
    setLoading(false);
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  function navFecha(dias: number) {
    const d = new Date(`${fecha}T12:00:00`);
    d.setDate(d.getDate() + dias);
    setFecha(d.toISOString().split("T")[0]);
  }

  const resumen = data?.resumen;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte del día</h1>
          <p className="text-sm text-gray-500">Resumen general de cantidades e importes, o detalle por pedido</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navFecha(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-40" />
          <Button variant="outline" size="icon" onClick={() => navFecha(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button onClick={() => handlePrint()}><Printer className="h-4 w-4" /> Imprimir {vista === "general" ? "general" : "detalle"}</Button>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit no-print">
        <button
          onClick={() => setVista("general")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${vista === "general" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
        >
          General
        </button>
        <button
          onClick={() => setVista("detalle")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${vista === "detalle" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
        >
          Detallado
        </button>
      </div>

      <div ref={printRef}>
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">Reporte {vista === "general" ? "general" : "detallado"} — {formatDate(fecha)}</h1>
          <p className="text-sm text-gray-600">Postres Tammy Light</p>
        </div>

        {loading ? (
          <p className="py-12 text-center text-gray-400">Cargando reporte...</p>
        ) : !data || data.resumen.pedidos === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No hay pedidos para {formatDate(fecha)}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {vista === "general" ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-gray-500">Pedidos</p>
                      <p className="text-2xl font-bold">{resumen!.pedidos}</p>
                      <p className="text-xs text-gray-400">{resumen!.clientes} clientes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-gray-500">Postres</p>
                      <p className="text-2xl font-bold text-pink-600">{resumen!.postresTotal}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-pink-100 bg-pink-50 print:bg-white">
                    <CardContent className="pt-4">
                      <p className="text-xs text-pink-700">Importe total</p>
                      <p className="text-2xl font-bold text-pink-700">{formatCurrency(resumen!.montoTotal)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-gray-500">Hechos / pendientes</p>
                      <p className="text-lg font-bold text-green-700">{resumen!.postresHechos} <span className="text-sm font-medium">u. {formatCurrency(resumen!.montoHechos)}</span></p>
                      <p className="text-lg font-bold text-amber-700">{resumen!.postresPendientes} <span className="text-sm font-medium">u. {formatCurrency(resumen!.montoPendientes)}</span></p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="print:shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Totales por cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50 text-gray-600">
                            <th className="text-left px-4 py-2 font-medium">Cliente</th>
                            <th className="text-center px-4 py-2 font-medium">Pedidos</th>
                            <th className="text-center px-4 py-2 font-medium">Postres</th>
                            <th className="text-center px-4 py-2 font-medium">Hechos</th>
                            <th className="text-center px-4 py-2 font-medium">En prod.</th>
                            <th className="text-center px-4 py-2 font-medium">Pendientes</th>
                            <th className="text-right px-4 py-2 font-medium">Importe</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.clientes.map((c) => (
                            <tr key={c.clienteId} className="border-b border-gray-50">
                              <td className="px-4 py-2 font-medium text-gray-900">{c.nombre}</td>
                              <td className="px-4 py-2 text-center">{c.pedidos.length}</td>
                              <td className="px-4 py-2 text-center font-semibold">{c.totalPostres}</td>
                              <td className="px-4 py-2 text-center text-green-700">{c.postresHechos}</td>
                              <td className="px-4 py-2 text-center text-blue-700">{c.postresEnProduccion}</td>
                              <td className="px-4 py-2 text-center text-amber-700">{c.postresPendientes}</td>
                              <td className="px-4 py-2 text-right font-semibold">{formatCurrency(c.montoTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-pink-50 font-bold">
                            <td className="px-4 py-2">Total</td>
                            <td className="px-4 py-2 text-center">{resumen!.pedidos}</td>
                            <td className="px-4 py-2 text-center">{resumen!.postresTotal}</td>
                            <td className="px-4 py-2 text-center text-green-700">{resumen!.postresHechos}</td>
                            <td className="px-4 py-2 text-center text-blue-700">{resumen!.postresEnProduccion}</td>
                            <td className="px-4 py-2 text-center text-amber-700">{resumen!.postresPendientes}</td>
                            <td className="px-4 py-2 text-right text-pink-700">{formatCurrency(resumen!.montoTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
            <Card className="print:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pedidos por cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.clientes.map((cliente) => (
                  <div key={cliente.clienteId} className="border border-gray-100 rounded-xl p-3 print:border-gray-300">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="font-semibold text-gray-900">{cliente.nombre}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">{cliente.pedidos.length} pedido{cliente.pedidos.length !== 1 ? "s" : ""}</Badge>
                        <span className="font-semibold">{cliente.totalPostres} postres</span>
                        <span className="text-green-700">{cliente.postresHechos} hechos</span>
                        {cliente.postresEnProduccion > 0 && <span className="text-blue-700">{cliente.postresEnProduccion} en prod.</span>}
                        {cliente.postresPendientes > 0 && <span className="text-amber-700">{cliente.postresPendientes} pend.</span>}
                        <span className="text-gray-500">{formatCurrency(cliente.montoTotal)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {cliente.pedidos.map((pedido) => (
                        <div key={pedido.id} className="bg-gray-50 rounded-lg p-2 print:bg-white print:border print:border-gray-200">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <div className="text-sm">
                              {pedido.notas && <span className="font-medium text-amber-800">📝 {pedido.notas} · </span>}
                              <span className="text-gray-500">{getRangoLabel(pedido.rangoHorario)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant={pedido.estado === "ENTREGADO" ? "success" : pedido.estado === "EN_PRODUCCION" ? "info" : "warning"}>
                                {ESTADO_LABEL[pedido.estado] ?? pedido.estado}
                              </Badge>
                              <span className="font-semibold">{pedido.totalPostres} postres</span>
                              <span className="text-gray-600">{formatCurrency(pedido.montoTotal)}</span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {agruparItemsPedido(pedido.items).map((grupo) => (
                              <div key={`${pedido.id}-${grupo.categoria}`}>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{grupo.categoria}</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-4 gap-1 text-xs">
                                  {grupo.items.map((item) => (
                                    <div key={`${pedido.id}-${item.nombre}`}>
                                      <span className="font-bold text-pink-600">{item.cantidad}</span> {item.nombre}
                                      <span className="text-gray-400"> · {grupo.categoria}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ListaPostres titulo="Postres hechos" vacio="Ningún postre entregado" items={data.postresHechos} color="text-green-700" />
              <ListaPostres titulo="En producción" vacio="Nada en producción" items={data.postresEnProduccion} color="text-blue-700" />
              <ListaPostres titulo="Pendientes" vacio="Sin pendientes" items={data.postresPendientes} color="text-amber-700" />
            </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          .no-print { display: none !important; }
          nav, header, aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function ListaPostres({
  titulo, vacio, items, color,
}: { titulo: string; vacio: string; items: ItemAgg[]; color: string }) {
  const grupos = agruparPorCategoria(items);
  const total = items.reduce((s, i) => s + i.cantidad, 0);
  return (
    <Card className="print:shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className={`text-base ${color}`}>{titulo} · {total}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">{vacio}</p>
        ) : (
          <div className="space-y-3">
            {grupos.map(([categoria, prods]) => (
              <div key={categoria}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{categoria}</p>
                <div className="space-y-1">
                  {prods.map((p) => (
                    <div key={p.producto} className="flex justify-between text-sm">
                      <span className="text-gray-700">{p.producto} <span className="text-xs text-gray-400">· {p.categoria}</span></span>
                      <span className={`font-bold ${color}`}>{p.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
