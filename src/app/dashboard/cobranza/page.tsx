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
import { DollarSign, CreditCard, Wallet, TrendingDown, Plus, Search } from "lucide-react";
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
}

interface FacturaSimple {
  id: string;
  numero: number;
  montoTotal: number;
  montoNeto: number;
  montoIva: number;
  tasaIva: number;
  saldoPendiente: number;
  estado: string;
}

export default function CobranzaPage() {
  const [resumen, setResumen] = useState<ResumenFinanciero | null>(null);
  const [deudas, setDeudas] = useState<ClienteDeuda[]>([]);
  const [pagosRecientes, setPagosRecientes] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);

  // Filtros
  const [clienteIdFiltro, setClienteIdFiltro] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");

  const [showPagoModal, setShowPagoModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteDeuda | null>(null);
  const [facturas, setFacturas] = useState<FacturaSimple[]>([]);

  // Form pago
  const [facturaId, setFacturaId] = useState("");
  const [monto, setMonto] = useState("");
  const [tipoPago, setTipoPago] = useState<"EFECTIVO" | "TRANSFERENCIA">("TRANSFERENCIA");
  const [observaciones, setObservaciones] = useState("");
  const [loadingPago, setLoadingPago] = useState(false);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const deudasParams = new URLSearchParams({ tipo: "deudas" });
      if (clienteIdFiltro) deudasParams.set("clienteId", clienteIdFiltro);
      if (desde) deudasParams.set("desde", desde);
      if (hasta) deudasParams.set("hasta", hasta);

      const pagosParams = new URLSearchParams({ tipo: "pagos" });
      if (clienteIdFiltro) pagosParams.set("clienteId", clienteIdFiltro);
      if (desde) pagosParams.set("desde", desde);
      if (hasta) pagosParams.set("hasta", hasta);

      const [resRes, deudasRes, pagosRes] = await Promise.all([
        fetch("/api/cobranza?tipo=resumen"),
        fetch(`/api/cobranza?${deudasParams}`),
        fetch(`/api/cobranza?${pagosParams}`),
      ]);
      const [resJson, deudasJson, pagosJson] = await Promise.all([
        resRes.json(), deudasRes.json(), pagosRes.json(),
      ]);
      setResumen(resJson.data);
      setDeudas(deudasJson.data ?? []);
      setPagosRecientes(pagosJson.data ?? []);
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

  async function abrirModalPago(cliente: ClienteDeuda) {
    setClienteSeleccionado(cliente);
    setFacturaId("");
    setMonto("");
    setObservaciones("");
    // Cargar facturas pendientes del cliente (include IVA fields)
    const res = await fetch(`/api/facturas?clienteId=${cliente.id}&estado=sin-cobrar`);
    const json = await res.json();
    setFacturas(json.data ?? []);
    setShowPagoModal(true);
  }

  async function registrarPago() {
    if (!clienteSeleccionado) return;
    if (!monto || Number(monto) <= 0) {
      toast({ title: "Ingresá un monto válido", variant: "destructive" }); return;
    }

    setLoadingPago(true);
    try {
      const res = await fetch("/api/cobranza", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteSeleccionado.id,
          facturaId: facturaId || undefined,
          monto: Number(monto),
          tipoPago,
          observaciones,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: "Pago registrado correctamente" });
        setShowPagoModal(false);
        cargarDatos();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setLoadingPago(false);
    }
  }

  const [tabActivo, setTabActivo] = useState<"cobranza" | "dinero">("cobranza");

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

      {tabActivo === "dinero" && (
        <ResumenDineroDisponible autoRefresh />
      )}

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

      {/* Deuda por cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deuda por cliente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Cargando...</div>
          ) : deudas.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p className="font-medium text-green-600">Sin deudas pendientes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Facturas</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Deuda</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {deudas.map((cliente) => (
                    <tr key={cliente.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{cliente.nombre}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">{cliente.cantidadFacturas}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        {formatCurrency(cliente.deuda)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => abrirModalPago(cliente)}>
                          <Plus className="h-3 w-3" />
                          Registrar pago
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

      {/* Modal de pago */}
      <Dialog open={showPagoModal} onOpenChange={setShowPagoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Registrar pago — {clienteSeleccionado?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {facturas.length > 0 && (
              <div className="space-y-2">
                <Label>Factura (opcional)</Label>
                <Select value={facturaId} onValueChange={(v) => {
                  setFacturaId(v);
                  const f = facturas.find((x) => x.id === v);
                  if (f) setMonto(String(f.saldoPendiente));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pago a cuenta general" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Pago a cuenta general</SelectItem>
                    {facturas.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        Factura #{f.numero} — {formatCurrency(f.saldoPendiente)} pendiente
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Monto *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de pago *</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTipoPago("EFECTIVO")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${tipoPago === "EFECTIVO" ? "border-pink-600 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  <Wallet className="h-4 w-4" />
                  Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setTipoPago("TRANSFERENCIA")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${tipoPago === "TRANSFERENCIA" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  <CreditCard className="h-4 w-4" />
                  Transferencia
                </button>
              </div>
            </div>

            {/* IVA desglosado — solo si la factura seleccionada tiene IVA */}
            {monto && Number(monto) > 0 && (() => {
              const facturaConIva = facturaId ? facturas.find((f) => f.id === facturaId) : null;
              const tieneIva = facturaConIva ? Number(facturaConIva.tasaIva) > 0 : false;
              if (!tieneIva) return null;
              const total = Number(monto);
              const tasa = Number(facturaConIva!.tasaIva);
              const neto = total / (1 + tasa);
              const iva = total - neto;
              return (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm space-y-1">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Desglose IVA {Math.round(tasa * 100)}%</p>
                  <div className="flex justify-between text-gray-600">
                    <span>Neto (sin IVA)</span>
                    <span>{formatCurrency(neto)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IVA {Math.round(tasa * 100)}%</span>
                    <span>{formatCurrency(iva)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-blue-200 pt-1 mt-1">
                    <span>Total</span>
                    <span className="text-pink-600">{formatCurrency(total)}</span>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input
                placeholder="Notas del pago..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowPagoModal(false)}>Cancelar</Button>
              <Button onClick={registrarPago} disabled={loadingPago}>
                {loadingPago ? "Guardando..." : "Registrar pago"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </>)}
    </div>
  );
}
