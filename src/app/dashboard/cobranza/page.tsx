"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { DollarSign, CreditCard, Wallet, TrendingDown, Plus, Search, ChevronDown, ChevronUp, Receipt, Pencil, Trash2 } from "lucide-react";
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
  fechaEntregaMasAntigua: string | null;
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
  const [pagoModal, setPagoModal] = useState<{ facturaId: string; facturaNumero: number; saldoPendiente: number; totalPagado: number; montoNeto: number; tasaIvaActual: number } | null>(null);
  const [monto, setMonto] = useState("");
  const [tipoPago, setTipoPago] = useState<"EFECTIVO" | "TRANSFERENCIA">("TRANSFERENCIA");
  const [conIva, setConIva] = useState(false);
  const [tasaIva, setTasaIva] = useState<0.21 | 0.105>(0.21);
  const [observaciones, setObservaciones] = useState("");
  const [loadingPago, setLoadingPago] = useState(false);

  // Modal editar cobro
  const [editPago, setEditPago] = useState<{
    id: string;
    facturaId: string;
    facturaNumero: number;
    monto: number;
    tipoPago: "EFECTIVO" | "TRANSFERENCIA";
    fechaPago: string;
    observaciones: string | null;
    montoMaximo: number;
  } | null>(null);
  const [editMonto, setEditMonto] = useState("");
  const [editTipoPago, setEditTipoPago] = useState<"EFECTIVO" | "TRANSFERENCIA">("TRANSFERENCIA");
  const [editFecha, setEditFecha] = useState("");
  const [editObs, setEditObs] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);

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

  // Abrir la cuenta de un cliente al llegar con ?clienteId= (por ejemplo desde el detalle de una factura)
  const clienteAAbrir = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (clienteAAbrir.current === undefined) {
      clienteAAbrir.current = new URLSearchParams(window.location.search).get("clienteId");
    }
    const id = clienteAAbrir.current;
    if (!id || loading) return;
    const conDeuda = deudas.find((d) => d.id === id);
    const cliente = clientes.find((c) => c.id === id);
    if (!conDeuda && !cliente) return;
    clienteAAbrir.current = null;
    abrirDetalle(conDeuda ?? {
      id, nombre: cliente!.nombre, deuda: 0, cantidadFacturas: 0,
      fechaPrimerFactura: null, fechaEntregaMasAntigua: null,
    });
  }, [loading, deudas, clientes]);

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
      totalPagado: factura.totalPagado,
      montoNeto: factura.montoNeto,
      tasaIvaActual: factura.tasaIva,
    });
    setMonto(String(factura.saldoPendiente.toFixed(2)));
    setConIva(false);
    setTasaIva(0.21);
    setObservaciones("");
    setTipoPago("TRANSFERENCIA");
  }

  // Solo se puede agregar IVA a facturas que todavía no lo tienen; si ya lo tienen, el saldo ya lo incluye.
  const facturaSinIva = !!pagoModal && Number(pagoModal.tasaIvaActual) === 0;
  const agregaIva = facturaSinIva && conIva;
  const saldoACobrar = pagoModal
    ? agregaIva
      ? Math.max(0, Math.round((pagoModal.montoNeto * (1 + tasaIva) - pagoModal.totalPagado) * 100) / 100)
      : pagoModal.saldoPendiente
    : 0;
  const montoCobro = parseFloat(monto) || 0;
  const superaSaldo = montoCobro > saldoACobrar + 0.005;

  function elegirIva(activar: boolean, tasa: 0.21 | 0.105 = tasaIva) {
    if (!pagoModal) return;
    setConIva(activar);
    setTasaIva(tasa);
    const nuevoSaldo = activar
      ? Math.max(0, pagoModal.montoNeto * (1 + tasa) - pagoModal.totalPagado)
      : pagoModal.saldoPendiente;
    setMonto(nuevoSaldo.toFixed(2));
  }

  function fechaInput(iso: string) {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function abrirEditarPago(factura: FacturaDetalle, pago: PagoDetalle) {
    const tipo = pago.tipoPago === "EFECTIVO" ? "EFECTIVO" : "TRANSFERENCIA";
    // Máximo = saldo actual + el monto de este cobro (lo que "libera" al editarlo)
    const montoMaximo = Math.round((factura.saldoPendiente + pago.monto) * 100) / 100;
    setEditPago({
      id: pago.id,
      facturaId: factura.id,
      facturaNumero: factura.numero,
      monto: pago.monto,
      tipoPago: tipo,
      fechaPago: pago.fechaPago,
      observaciones: pago.observaciones,
      montoMaximo,
    });
    setEditMonto(String(pago.monto));
    setEditTipoPago(tipo);
    setEditFecha(fechaInput(pago.fechaPago));
    setEditObs(pago.observaciones ?? "");
  }

  async function guardarEdicionPago() {
    if (!editPago || !clienteDetalle) return;
    const nuevoMonto = parseFloat(editMonto) || 0;
    if (nuevoMonto <= 0) {
      toast({ title: "Ingresá un monto válido", variant: "destructive" });
      return;
    }
    if (nuevoMonto > editPago.montoMaximo + 0.005) {
      toast({ title: "El monto supera el saldo de la factura", variant: "destructive" });
      return;
    }
    setLoadingEdit(true);
    try {
      const res = await fetch(`/api/cobranza/${editPago.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: nuevoMonto,
          tipoPago: editTipoPago,
          fechaPago: editFecha || undefined,
          observaciones: editObs,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "No se pudo editar el cobro", description: typeof json.error === "string" ? json.error : undefined, variant: "destructive" });
        return;
      }
      toast({ title: "Cobro actualizado" });
      setEditPago(null);
      await abrirDetalle(clienteDetalle);
      cargarDatos();
    } finally {
      setLoadingEdit(false);
    }
  }

  async function borrarPago(pagoId: string) {
    if (!clienteDetalle) return;
    if (!confirm("¿Eliminar este cobro? El saldo de la factura se va a recalcular.")) return;
    const res = await fetch(`/api/cobranza/${pagoId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: "No se pudo eliminar", description: typeof json.error === "string" ? json.error : undefined, variant: "destructive" });
      return;
    }
    toast({ title: "Cobro eliminado" });
    await abrirDetalle(clienteDetalle);
    cargarDatos();
  }

  async function registrarCobro() {
    if (!pagoModal || montoCobro <= 0) {
      toast({ title: "Ingresá un monto válido", variant: "destructive" }); return;
    }
    if (superaSaldo) {
      toast({ title: "El monto supera el saldo pendiente", variant: "destructive" }); return;
    }
    setLoadingPago(true);
    try {
      if (agregaIva) {
        const ivaRes = await fetch(`/api/facturas/${pagoModal.facturaId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasaIva }),
        });
        if (!ivaRes.ok) {
          const ivaJson = await ivaRes.json();
          toast({ title: "No se pudo aplicar el IVA", description: ivaJson.error, variant: "destructive" });
          return;
        }
      }

      const res = await fetch("/api/cobranza", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteDetalle!.id,
          facturaId: pagoModal.facturaId,
          monto: montoCobro,
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
        const description = typeof json.error === "string" ? json.error : "Revisá los datos del cobro";
        toast({ title: "Error", description, variant: "destructive" });
        if (agregaIva) await abrirDetalle(clienteDetalle!);
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
                <label className="text-xs font-medium text-gray-600 mb-1 block">Entrega desde</label>
                <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Entrega hasta</label>
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
                      <th className="text-left px-4 py-3 font-medium text-gray-600">F. Entrega</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">F. Factura</th>
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
                          {cliente.fechaEntregaMasAntigua ? formatDate(cliente.fechaEntregaMasAntigua) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
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
                            <div key={pago.id} className="flex items-center justify-between gap-2 text-sm bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <div className="flex items-center gap-2 min-w-0">
                                {pago.tipoPago === "EFECTIVO"
                                  ? <Wallet className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                  : <CreditCard className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                <span className="text-gray-600">{formatDate(pago.fechaPago)}</span>
                                {pago.observaciones && <span className="text-gray-400 text-xs truncate">· {pago.observaciones}</span>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="font-semibold text-green-700 mr-1">{formatCurrency(pago.monto)}</span>
                                <button
                                  type="button"
                                  className="p-1.5 rounded-md text-gray-400 hover:text-pink-600 hover:bg-pink-50"
                                  title="Editar cobro"
                                  onClick={() => abrirEditarPago(factura, pago)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                                  title="Eliminar cobro"
                                  onClick={() => borrarPago(pago.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
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
                <span className="text-red-600 font-medium">Saldo pendiente: {formatCurrency(saldoACobrar)}</span>
                <span className="text-gray-400 text-xs ml-2">(podés cobrar un monto parcial)</span>
                {Number(pagoModal.tasaIvaActual) > 0 && (
                  <p className="text-xs text-blue-600 mt-1">Incluye IVA {Math.round(Number(pagoModal.tasaIvaActual) * 1000) / 10}%</p>
                )}
              </div>

              {/* Toggle IVA: solo para facturas que todavía no tienen IVA */}
              {facturaSinIva && (
              <div className="space-y-2">
                <Label>¿Facturar con IVA?</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => elegirIva(false)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${!conIva ? "border-pink-600 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600"}`}
                  >
                    Sin IVA
                  </button>
                  <button
                    type="button"
                    onClick={() => elegirIva(true)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${conIva ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
                  >
                    Con IVA
                  </button>
                </div>
                {conIva && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => elegirIva(true, 0.21)}
                      className={`flex-1 py-1.5 px-3 rounded-lg border-2 text-sm transition-colors ${tasaIva === 0.21 ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}
                    >
                      21%
                    </button>
                    <button
                      type="button"
                      onClick={() => elegirIva(true, 0.105)}
                      className={`flex-1 py-1.5 px-3 rounded-lg border-2 text-sm transition-colors ${tasaIva === 0.105 ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}
                    >
                      10.5%
                    </button>
                  </div>
                )}
                {agregaIva && (
                  <p className="text-xs text-blue-600">
                    La factura pasará a incluir IVA {tasaIva === 0.21 ? "21" : "10,5"}% sobre {formatCurrency(pagoModal.montoNeto)}.
                  </p>
                )}
              </div>
              )}

              {/* Monto a cobrar (final, con IVA si corresponde) */}
              <div className="space-y-1">
                <Label>Monto a cobrar *</Label>
                <Input
                  type="number" min="0.01" step="0.01"
                  max={saldoACobrar}
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
                {superaSaldo && (
                  <p className="text-xs text-red-600">No puede superar el saldo de {formatCurrency(saldoACobrar)}</p>
                )}
                {montoCobro > 0 && !superaSaldo && montoCobro < saldoACobrar - 0.005 && (
                  <p className="text-xs text-gray-500">Quedará un saldo de {formatCurrency(saldoACobrar - montoCobro)}</p>
                )}
              </div>

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
                <Button onClick={registrarCobro} disabled={loadingPago || montoCobro <= 0 || superaSaldo}>
                  {loadingPago ? "Guardando..." : `Registrar ${formatCurrency(montoCobro)}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Editar cobro ────────────────────────────────── */}
      <Dialog open={!!editPago} onOpenChange={(o) => { if (!o) setEditPago(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar cobro — Factura #{editPago?.facturaNumero}</DialogTitle>
          </DialogHeader>

          {editPago && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm">
                <span className="text-amber-800 font-medium">Máximo: {formatCurrency(editPago.montoMaximo)}</span>
                <span className="text-gray-400 text-xs ml-2">(saldo + este cobro)</span>
              </div>

              <div className="space-y-1">
                <Label>Monto *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={editPago.montoMaximo}
                  value={editMonto}
                  onChange={(e) => setEditMonto(e.target.value)}
                />
                {(parseFloat(editMonto) || 0) > editPago.montoMaximo + 0.005 && (
                  <p className="text-xs text-red-600">No puede superar {formatCurrency(editPago.montoMaximo)}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Fecha del cobro</Label>
                <Input type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Método de pago</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditTipoPago("EFECTIVO")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${editTipoPago === "EFECTIVO" ? "border-pink-600 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600"}`}
                  >
                    <Wallet className="h-4 w-4" /> Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTipoPago("TRANSFERENCIA")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${editTipoPago === "TRANSFERENCIA" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
                  >
                    <CreditCard className="h-4 w-4" /> Transferencia
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Observaciones</Label>
                <Input
                  placeholder="Ej: corregido monto..."
                  value={editObs}
                  onChange={(e) => setEditObs(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-1">
                <Button variant="outline" onClick={() => setEditPago(null)}>Cancelar</Button>
                <Button
                  onClick={guardarEdicionPago}
                  disabled={
                    loadingEdit
                    || (parseFloat(editMonto) || 0) <= 0
                    || (parseFloat(editMonto) || 0) > editPago.montoMaximo + 0.005
                  }
                >
                  {loadingEdit ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
