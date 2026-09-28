"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { DollarSign, CreditCard, Wallet, TrendingDown, Plus, Search, ChevronDown, ChevronUp, Receipt } from "lucide-react";
import ResumenDineroDisponible from "@/components/dashboard/ResumenDineroDisponible";

interface ResumenFinanciero {
  totalEfectivo: number;
  totalTransferencias: number;
  totalCobrado: number;
  totalDeuda: number;
}

interface ClienteDeuda {
  id: string;
  nombre: string;
  deuda: number;
  cantidadFacturas: number;
  fechaPrimerFactura: string | null;
}

interface PagoDetalle {
  id: string;
  monto: number;
  tipoPago: string;
  fechaPago: string;
  observaciones: string | null;
}

interface FacturaDetalle {
  id: string;
  numero: number;
  fecha: string;
  montoTotal: number;
  montoNeto: number;
  montoIva: number;
  tasaIva: number;
  totalPagado: number;
  saldoPendiente: number;
  estado: string;
  pedido: { id: string; fechaEntrega: string } | null;
  pagos: PagoDetalle[];
}

export default function CobranzaPage() {
  const [resumen, setResumen] = useState<ResumenFinanciero | null>(null);
  const [deudas, setDeudas] = useState<ClienteDeuda[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);

  // Filtros
  const [clienteIdFiltro, setClienteIdFiltro] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");

  // Modal detalle de cuenta del cliente
  const [clienteDetalle, setClienteDetalle] = useState<ClienteDeuda | null>(null);
  const [facturasDetalle, setFacturasDetalle] = useState<FacturaDetalle[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [expandedFactura, setExpandedFactura] = useState<string | null>(null);

  // Modal registrar cobro
  const [pagoModal, setPagoModal] = useState<{ facturaId: string; facturaNumero: number; saldoPendiente: number; montoNeto: number; tasaIvaActual: number } | null>(null);
  const [monto, setMonto] = useState("");
  const [tipoPago, setTipoPago] = useState<"EFECTIVO" | "TRANSFERENCIA">("TRANSFERENCIA");
  const [conIva, setConIva] = useState(false);
  const [tasaIva, setTasaIva] = useState<0.21 | 0.105>(0.21);
  const [observaciones, setObservaciones] = useState("");
  const [loadingPago, setLoadingPago] = useState(false);

  const [tabActivo, setTabActivo] = useState<"cobranza" | "dinero">("cobranza");

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const deudasParams = new URLSearchParams({ tipo: "deudas" });
      if (clienteIdFiltro) deudasParams.set("clienteId", clienteIdFiltro);
      if (desde) deudasParams.set("desde", desde);
      if (hasta) deudasParams.set("hasta", hasta);

      const [resRes, deudasRes] = await Promise.all([
        fetch("/api/cobranza?tipo=resumen"),
        fetch(`/api/cobranza?${deudasParams}`),
      ]);
      const [resJson, deudasJson] = await Promise.all([resRes.json(), deudasRes.json()]);
      setResumen(resJson.data);
      setDeudas(deudasJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [clienteIdFiltro, desde, hasta]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  useEffect(() => {
    fetch("/api/clientes?pageSize=200")
      .then((r) => r.json())
      .then((j) => setClientes(j.data ?? []));
  }, []);

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())
  );

  function limpiarFiltros() {
    setClienteIdFiltro("");
    setDesde("");
    setHasta("");
    setBusquedaCliente("");
  }

  async function abrirDetalle(cliente: ClienteDeuda) {
    setClienteDetalle(cliente);
    setLoadingDetalle(true);
    setFacturasDetalle([]);
    setExpandedFactura(null);
    const res = await fetch(`/api/cobranza?tipo=detalle-cliente&clienteId=${cliente.id}`);
    const json = await res.json();
    setFacturasDetalle(json.data ?? []);
    setLoadingDetalle(false);
  }

  function abrirPagoModal(factura: FacturaDetalle) {
    setPagoModal({
      facturaId: factura.id,
      facturaNumero: factura.numero,
      saldoPendiente: factura.saldoPendiente,
      montoNeto: factura.montoNeto,
      tasaIvaActual: factura.tasaIva,
    });
    setMonto(String(factura.saldoPendiente.toFixed(2)));
    setConIva(Number(factura.tasaIva) > 0);
    setTasaIva(Number(factura.tasaIva) === 0.105 ? 0.105 : 0.21);
    setObservaciones("");
    setTipoPago("TRANSFERENCIA");
  }

  const montoBase = parseFloat(monto) || 0;
  const ivaCalculado = conIva ? montoBase * tasaIva : 0;
  const totalConIva = montoBase + ivaCalculado;

  async function registrarCobro() {
    if (!pagoModal || montoBase <= 0) {
      toast({ title: "Ingresá un monto válido", variant: "destructive" }); return;
    }
    setLoadingPago(true);
    try {
      // Si activó IVA y la factura no lo tenía, actualizamos la factura primero
      if (conIva && Number(pagoModal.tasaIvaActual) === 0) {
        await fetch(`/api/facturas/${pagoModal.facturaId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasaIva }),
        });
      }

      // Registrar el pago (monto incluye IVA si aplica)
      const res = await fetch("/api/cobranza", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteDetalle!.id,
          facturaId: pagoModal.facturaId,
          monto: totalConIva,
          tipoPago,
          observaciones: observaciones || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: "Cobro registrado correctamente" });
        setPagoModal(null);
        // Recargar detalle y resumen
        await abrirDetalle(clienteDetalle!);
        cargarDatos();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setLoadingPago(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cobranza</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTabActivo("cobranza")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tabActivo === "cobranza" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          💳 Deuda de Clientes
        </button>
        <button
          onClick={() => setTabActivo("dinero")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tabActivo === "dinero" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          💰 Dinero Disponible
        </button>
      </div>

      {tabActivo === "dinero" && <ResumenDineroDisponible autoRefresh />}

      {tabActivo === "cobranza" && (<>
        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente</label>
                <Select value={clienteIdFiltro} onValueChange={(v) => setClienteIdFiltro(v === "todos" ? "" : v)}>
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
                <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Hasta</label>
                <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </div>
            </div>
            {(clienteIdFiltro || desde || hasta) && (
              <button onClick={limpiarFiltros} className="mt-2 text-xs text-pink-600 hover:underline">
                Limpiar filtros
              </button>
            )}
          </CardContent>
        </Card>

        {/* Resumen financiero */}
        {resumen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Efectivo cobrado</CardTitle>
                <Wallet className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(resumen.totalEfectivo)}</p>
                <p className="text-xs text-gray-500">Total en caja</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Transferencias</CardTitle>
                <CreditCard className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(resumen.totalTransferencias)}</p>
                <p className="text-xs text-gray-500">Total en banco</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total cobrado</CardTitle>
                <DollarSign className="h-4 w-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-pink-600">{formatCurrency(resumen.totalCobrado)}</p>
                <p className="text-xs text-gray-500">Efectivo + transferencias</p>
              </CardContent>
            </Card>
            <Card className="border-red-100 bg-red-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Deuda total</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(resumen.totalDeuda)}</p>
                <p className="text-xs text-gray-500">Facturas pendientes</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabla deudas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deuda por cliente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-gray-500">Cargando...</div>
            ) : deudas.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-medium text-green-600">✓ Sin deudas pendientes</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Desde</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Facturas</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Deuda</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deudas.map((cliente) => (
                      <tr key={cliente.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{cliente.nombre}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {cliente.fechaPrimerFactura ? formatDate(cliente.fechaPrimerFactura) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{cliente.cantidadFacturas}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">
                          {formatCurrency(cliente.deuda)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" onClick={() => abrirDetalle(cliente)}>
                            <Receipt className="h-3 w-3" />
                            Ver cuenta
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </>)}

      {/* ── Modal: Cuenta del cliente ─────────────────────────────── */}
      <Dialog open={!!clienteDetalle} onOpenChange={(o) => { if (!o) { setClienteDetalle(null); setPagoModal(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cuenta de {clienteDetalle?.nombre}</DialogTitle>
          </DialogHeader>

          {loadingDetalle ? (
            <div className="py-8 text-center text-gray-500">Cargando facturas...</div>
          ) : facturasDetalle.length === 0 ? (
            <div className="py-8 text-center text-green-600 font-medium">✓ Sin deudas pendientes</div>
          ) : (
            <div className="space-y-3">
              {/* Totales del cliente */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-3 text-center text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Total facturado</p>
                  <p className="font-bold text-gray-900">{formatCurrency(facturasDetalle.reduce((s, f) => s + f.montoTotal, 0))}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Ya cobrado</p>
                  <p className="font-bold text-green-600">{formatCurrency(facturasDetalle.reduce((s, f) => s + f.totalPagado, 0))}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Saldo pendiente</p>
                  <p className="font-bold text-red-600">{formatCurrency(facturasDetalle.reduce((s, f) => s + f.saldoPendiente, 0))}</p>
                </div>
              </div>

              {/* Lista de facturas */}
              {facturasDetalle.map((factura) => (
                <div key={factura.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Encabezado factura */}
                  <div className="bg-white px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">Factura #{factura.numero}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(factura.fecha)}
                          {factura.pedido && ` · Entrega: ${formatDate(factura.pedido.fechaEntrega)}`}
                        </p>
                      </div>
                      {Number(factura.tasaIva) > 0 && (
                        <Badge variant="info" className="text-xs shrink-0">IVA {Math.round(Number(factura.tasaIva) * 100)}%</Badge>
                      )}
                    </div>

                    {/* Montos */}
                    <div className="text-right text-sm shrink-0">
                      <p className="text-gray-500 text-xs">Total: {formatCurrency(factura.montoTotal)}</p>
                      <p className="text-green-600 text-xs">Cobrado: {formatCurrency(factura.totalPagado)}</p>
                      <p className="font-bold text-red-600">Debe: {formatCurrency(factura.saldoPendiente)}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" onClick={() => abrirPagoModal(factura)} disabled={factura.saldoPendiente <= 0}>
                        <Plus className="h-3 w-3" />
                        Cobrar
                      </Button>
                      <button
                        className="p-1 text-gray-400 hover:text-gray-600"
                        onClick={() => setExpandedFactura(expandedFactura === factura.id ? null : factura.id)}
                      >
                        {expandedFactura === factura.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Historial de pagos expandible */}
                  {expandedFactura === factura.id && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                      {factura.pagos.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-2">Sin pagos registrados aún</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500 mb-2">Historial de cobros:</p>
                          {factura.pagos.map((pago) => (
                            <div key={pago.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <div className="flex items-center gap-2">
                                {pago.tipoPago === "EFECTIVO"
                                  ? <Wallet className="h-3.5 w-3.5 text-green-600" />
                                  : <CreditCard className="h-3.5 w-3.5 text-blue-600" />}
                                <span className="text-gray-600">{formatDate(pago.fechaPago)}</span>
                                {pago.observaciones && <span className="text-gray-400 text-xs">· {pago.observaciones}</span>}
                              </div>
                              <span className="font-semibold text-green-700">{formatCurrency(pago.monto)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Registrar cobro ────────────────────────────────── */}
      <Dialog open={!!pagoModal} onOpenChange={(o) => { if (!o) setPagoModal(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar cobro — Factura #{pagoModal?.facturaNumero}</DialogTitle>
          </DialogHeader>

          {pagoModal && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm">
                <span className="text-red-600 font-medium">Saldo pendiente: {formatCurrency(pagoModal.saldoPendiente)}</span>
                <span className="text-gray-400 text-xs ml-2">(podés cobrar un monto parcial)</span>
              </div>

              {/* Monto base */}
              <div className="space-y-1">
                <Label>Monto a cobrar (base sin IVA) *</Label>
                <Input
                  type="number" min="0.01" step="0.01"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>

              {/* Toggle IVA */}
              <div className="space-y-2">
                <Label>¿Cobrar con IVA?</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConIva(false)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${!conIva ? "border-pink-600 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600"}`}
                  >
                    Sin IVA
                  </button>
                  <button
                    type="button"
                    onClick={() => setConIva(true)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${conIva ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
                  >
                    Con IVA
                  </button>
                </div>
                {conIva && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTasaIva(0.21)}
                      className={`flex-1 py-1.5 px-3 rounded-lg border-2 text-sm transition-colors ${tasaIva === 0.21 ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}
                    >
                      21%
                    </button>
                    <button
                      type="button"
                      onClick={() => setTasaIva(0.105)}
                      className={`flex-1 py-1.5 px-3 rounded-lg border-2 text-sm transition-colors ${tasaIva === 0.105 ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}
                    >
                      10.5%
                    </button>
                  </div>
                )}
              </div>

              {/* Resumen de cobro */}
              {montoBase > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 border border-gray-100">
                  <div className="flex justify-between text-gray-600">
                    <span>Base</span>
                    <span>{formatCurrency(montoBase)}</span>
                  </div>
                  {conIva && (
                    <div className="flex justify-between text-blue-600">
                      <span>IVA {Math.round(tasaIva * 100)}%</span>
                      <span>{formatCurrency(ivaCalculado)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1 text-gray-900">
                    <span>Total a cobrar</span>
                    <span className="text-pink-600">{formatCurrency(totalConIva)}</span>
                  </div>
                </div>
              )}

              {/* Método de pago */}
              <div className="space-y-1">
                <Label>Método de pago</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoPago("EFECTIVO")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${tipoPago === "EFECTIVO" ? "border-pink-600 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600"}`}
                  >
                    <Wallet className="h-4 w-4" /> Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPago("TRANSFERENCIA")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${tipoPago === "TRANSFERENCIA" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
                  >
                    <CreditCard className="h-4 w-4" /> Transferencia
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Observaciones</Label>
                <Input
                  placeholder="Ej: pago parcial, cuota 1..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-1">
                <Button variant="outline" onClick={() => setPagoModal(null)}>Cancelar</Button>
                <Button onClick={registrarCobro} disabled={loadingPago || montoBase <= 0}>
                  {loadingPago ? "Guardando..." : `Registrar ${formatCurrency(totalConIva)}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
