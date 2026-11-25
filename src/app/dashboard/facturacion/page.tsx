"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { FileText, Search, ChevronLeft, ChevronRight, Printer, Copy, CheckCircle2, X } from "lucide-react";

interface ImporteArca {
  total: number;
  neto: number;
  iva: number;
}

interface Factura {
  id: string;
  numero: number;
  fecha: string;
  montoTotal: string | number;
  saldoPendiente: number;
  ivaArcaAdicional?: number;
  montoACobrar?: number;
  totalCreditos?: number;
  estado: "PENDIENTE" | "PARCIALMENTE_COBRADA" | "COBRADA" | "ANULADA";
  cliente: { id: string; nombre: string };
  porcentajeArca: number;
  tasaIvaArca: number;
  facturadoArca: boolean;
  comprobanteArca: string | null;
  arca: ImporteArca;
}

interface Cliente {
  id: string;
  nombre: string;
}

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: "Sin cobrar",
  PARCIALMENTE_COBRADA: "Parcial",
  COBRADA: "Cobrada",
  ANULADA: "Anulada",
};

const ESTADO_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  PENDIENTE: "destructive",
  PARCIALMENTE_COBRADA: "warning",
  COBRADA: "success",
  ANULADA: "secondary",
};

function copiar(valor: number, etiqueta: string) {
  navigator.clipboard.writeText(valor.toFixed(2).replace(".", ","));
  toast({ title: `${etiqueta} copiado`, description: formatCurrency(valor) });
}

function PorcentajeArcaInput({ factura, onGuardar }: { factura: Factura; onGuardar: (pct: number) => void }) {
  const inicial = String(Math.round(factura.porcentajeArca * 10000) / 100);
  const [valor, setValor] = useState(inicial);
  const bloqueado = factura.facturadoArca || factura.estado === "ANULADA";

  function guardar() {
    const pct = Number(valor.replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast({ title: "El porcentaje tiene que estar entre 0 y 100", variant: "destructive" });
      setValor(inicial);
      return;
    }
    if (String(pct) !== inicial) onGuardar(pct);
  }

  return (
    <div className="relative w-20">
      <Input
        type="number" min="0" max="100" step="1"
        className="h-8 pr-6 text-right text-sm"
        value={valor}
        disabled={bloqueado}
        onChange={(e) => setValor(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      />
      <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
    </div>
  );
}

export default function FacturacionPage() {
  const router = useRouter();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filters
  const [estadoFiltro, setEstadoFiltro] = useState("sin-cobrar");
  const [arcaFiltro, setArcaFiltro] = useState("todas");
  const [clienteId, setClienteId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");

  // Diálogo "Marcar facturada en ARCA"
  const [marcarArca, setMarcarArca] = useState<Factura | null>(null);
  const [comprobante, setComprobante] = useState("");
  const [guardandoArca, setGuardandoArca] = useState(false);

  const fetchFacturas = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      estado: estadoFiltro,
    });
    if (arcaFiltro !== "todas") params.set("arca", arcaFiltro);
    if (clienteId) params.set("clienteId", clienteId);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);

    const res = await fetch(`/api/facturas?${params}`);
    const json = await res.json();
    setFacturas(json.data ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [page, estadoFiltro, arcaFiltro, clienteId, desde, hasta]);

  useEffect(() => { fetchFacturas(); }, [fetchFacturas]);

  useEffect(() => {
    fetch("/api/clientes?pageSize=200")
      .then((r) => r.json())
      .then((j) => setClientes(j.data ?? []));
  }, []);

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())
  );

  const totalPages = Math.ceil(total / pageSize);

  const totalesArca = facturas
    .filter((f) => f.estado !== "ANULADA")
    .reduce((acc, f) => ({
      total: acc.total + f.arca.total,
      neto: acc.neto + f.arca.neto,
      iva: acc.iva + f.arca.iva,
    }), { total: 0, neto: 0, iva: 0 });

  function limpiarFiltros() {
    setEstadoFiltro("sin-cobrar");
    setArcaFiltro("todas");
    setClienteId("");
    setDesde("");
    setHasta("");
    setBusquedaCliente("");
    setPage(1);
  }

  async function actualizarArca(factura: Factura, body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/facturas/${factura.id}/arca`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: "No se pudo guardar", description: json.error, variant: "destructive" });
      await fetchFacturas();
      return false;
    }
    setFacturas((prev) => prev.map((f) => (f.id === factura.id ? { ...f, ...json.data } : f)));
    return true;
  }

  async function confirmarFacturadaArca() {
    if (!marcarArca) return;
    if (!comprobante.trim()) {
      toast({ title: "Ingresá el número de comprobante", variant: "destructive" });
      return;
    }
    setGuardandoArca(true);
    const ok = await actualizarArca(marcarArca, { facturadoArca: true, comprobanteArca: comprobante.trim() });
    setGuardandoArca(false);
    if (ok) {
      toast({ title: "Marcada como facturada en ARCA" });
      setMarcarArca(null);
      await fetchFacturas(); // el IVA ARCA se suma a la deuda → refrescar saldos
    }
  }

  async function desmarcarArca(factura: Factura) {
    if (!confirm(`¿Desmarcar la factura FAC-${String(factura.numero).padStart(5, "0")} como facturada en ARCA?`)) return;
    if (await actualizarArca(factura, { facturadoArca: false })) {
      toast({ title: "Desmarcada" });
      await fetchFacturas();
    }
  }

  function imprimirRemito(factura: Factura) {
    window.open(`/dashboard/facturacion/${factura.id}/remito`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
          <p className="text-gray-500 text-sm mt-1">{total} factura{total !== 1 ? "s" : ""} en total</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Estado</label>
              <Select value={estadoFiltro} onValueChange={(v) => { setEstadoFiltro(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin-cobrar">Sin cobrar</SelectItem>
                  <SelectItem value="cobrada">Cobradas</SelectItem>
                  <SelectItem value="todas">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">ARCA</label>
              <Select value={arcaFiltro} onValueChange={(v) => { setArcaFiltro(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendiente">Sin facturar en ARCA</SelectItem>
                  <SelectItem value="facturado">Facturadas en ARCA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente</label>
              <Select value={clienteId} onValueChange={(v) => { setClienteId(v === "todos" ? "" : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 pb-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                      <Input
                        placeholder="Buscar cliente..."
                        className="pl-7 h-8 text-sm"
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                      />
                    </div>
                  </div>
                  <SelectItem value="todos">Todos los clientes</SelectItem>
                  {clientesFiltrados.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Desde</label>
              <Input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }} />
            </div>
          </div>

          {(estadoFiltro !== "sin-cobrar" || arcaFiltro !== "todas" || clienteId || desde || hasta) && (
            <button
              onClick={limpiarFiltros}
              className="mt-2 text-xs text-pink-600 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-pink-600" />
            Facturas
          </CardTitle>
          <p className="text-xs text-gray-500">
            El % ARCA define cuánto del total se factura (IVA incluido). No cambia lo que se le cobra al cliente.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
          ) : facturas.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No hay facturas con los filtros seleccionados</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nº Factura</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">% ARCA</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Importe ARCA</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">ARCA</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((f) => {
                    const anulada = f.estado === "ANULADA";
                    return (
                      <tr
                        key={f.id}
                        className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/facturacion/${f.id}`)}
                      >
                        <td className="px-4 py-3 font-mono font-medium text-gray-900">
                          FAC-{String(f.numero).padStart(5, "0")}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(f.fecha)}</td>
                        <td className="px-4 py-3 text-gray-900">{f.cliente.nombre}</td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(f.montoACobrar ?? Number(f.montoTotal))}
                          </p>
                          {!!f.ivaArcaAdicional && f.ivaArcaAdicional > 0 && (
                            <p className="text-[11px] text-amber-700 whitespace-nowrap">
                              Base {formatCurrency(Number(f.montoTotal))} + IVA ARCA {formatCurrency(f.ivaArcaAdicional)}
                            </p>
                          )}
                          {!!f.totalCreditos && f.totalCreditos > 0 && (
                            <p className="text-[11px] text-blue-600 whitespace-nowrap">
                              − NC {formatCurrency(f.totalCreditos)}
                            </p>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${f.saldoPendiente > 0 ? "text-red-600" : "text-gray-400"}`}>
                          {formatCurrency(f.saldoPendiente)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={ESTADO_VARIANT[f.estado] ?? "secondary"}>
                            {ESTADO_LABELS[f.estado] ?? f.estado}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <PorcentajeArcaInput
                              key={`${f.id}-${f.porcentajeArca}`}
                              factura={f}
                              onGuardar={(pct) => actualizarArca(f, { porcentajeArca: pct })}
                            />
                            <select
                              className="h-8 rounded-md border border-gray-300 bg-white px-1 text-xs disabled:opacity-50"
                              value={String(f.tasaIvaArca)}
                              disabled={f.facturadoArca || anulada}
                              onChange={(e) => actualizarArca(f, { tasaIvaArca: Number(e.target.value) })}
                              title="Alícuota de IVA"
                            >
                              <option value="0.21">21%</option>
                              <option value="0.105">10,5%</option>
                            </select>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right cursor-default" onClick={(e) => e.stopPropagation()}>
                          {f.arca.total > 0 ? (
                            <div className="space-y-0.5">
                              <button
                                className="inline-flex items-center gap-1 font-semibold text-gray-900 hover:text-pink-600"
                                onClick={() => copiar(f.arca.total, "Total")}
                                title="Copiar total"
                              >
                                {formatCurrency(f.arca.total)} <Copy className="h-3 w-3" />
                              </button>
                              <div className="flex justify-end gap-2 text-[11px] text-gray-500 whitespace-nowrap">
                                <button className="hover:text-pink-600" onClick={() => copiar(f.arca.neto, "Neto")} title="Copiar neto">
                                  Neto {formatCurrency(f.arca.neto)}
                                </button>
                                <span>·</span>
                                <button className="hover:text-pink-600" onClick={() => copiar(f.arca.iva, "IVA")} title="Copiar IVA">
                                  IVA {formatCurrency(f.arca.iva)}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center cursor-default" onClick={(e) => e.stopPropagation()}>
                          {f.facturadoArca ? (
                            <span className="inline-flex items-center gap-1">
                              <Badge variant="success" className="font-mono">{f.comprobanteArca}</Badge>
                              <button
                                className="text-gray-400 hover:text-red-600"
                                onClick={() => desmarcarArca(f)}
                                title="Desmarcar facturada en ARCA"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ) : !anulada && f.arca.total > 0 ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setMarcarArca(f); setComprobante(""); }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Marcar facturada
                            </Button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => imprimirRemito(f)}
                              title="Imprimir remito"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Remito
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/dashboard/facturacion/${f.id}`)}
                            >
                              Ver
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-gray-50 text-sm">
                    <td colSpan={7} className="px-4 py-3 text-right font-medium text-gray-600">
                      Total ARCA de esta página
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(totalesArca.total)}</p>
                      <p className="text-[11px] text-gray-500 whitespace-nowrap">
                        Neto {formatCurrency(totalesArca.neto)} · IVA {formatCurrency(totalesArca.iva)}
                      </p>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Página {page} de {totalPages} ({total} facturas)
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo: marcar facturada en ARCA */}
      <Dialog open={!!marcarArca} onOpenChange={(o) => { if (!o) setMarcarArca(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Facturada en ARCA — FAC-{String(marcarArca?.numero ?? 0).padStart(5, "0")}
            </DialogTitle>
          </DialogHeader>
          {marcarArca && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 border border-gray-100">
                <div className="flex justify-between text-gray-600">
                  <span>Neto</span><span>{formatCurrency(marcarArca.arca.neto)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IVA {marcarArca.tasaIvaArca === 0.105 ? "10,5" : "21"}%</span>
                  <span>{formatCurrency(marcarArca.arca.iva)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1 text-gray-900">
                  <span>Total facturado</span><span>{formatCurrency(marcarArca.arca.total)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="comprobante">Número de comprobante *</Label>
                <Input
                  id="comprobante"
                  placeholder="Ej: 0001-00001234"
                  value={comprobante}
                  autoFocus
                  onChange={(e) => setComprobante(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmarFacturadaArca(); }}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setMarcarArca(null)}>Cancelar</Button>
                <Button onClick={confirmarFacturadaArca} disabled={guardandoArca}>
                  {guardandoArca ? "Guardando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
