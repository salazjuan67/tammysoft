"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Plus, FileText, ChevronLeft, ChevronRight, Pencil, Trash2, CreditCard } from "lucide-react";

interface FacturaProveedor {
  id: string;
  numeroFactura: string;
  proveedor: { id: string; nombre: string };
  fechaEmision: string;
  fechaVencimiento: string | null;
  montoNeto: number;
  montoIva: number;
  montoTotal: number;
  concepto: string;
  estado: string;
  estadoMostrar: string;
  saldoPendiente: number;
  observaciones: string | null;
}

interface Proveedor { id: string; nombre: string }

const ESTADO_BADGE: Record<string, "destructive" | "warning" | "success" | "secondary"> = {
  PENDIENTE: "destructive",
  PARCIALMENTE_PAGADA: "warning",
  PAGADA: "success",
  VENCIDA: "destructive",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PARCIALMENTE_PAGADA: "Parcial",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
};

const CONCEPTOS = ["Insumos", "Empaques", "Servicios", "Logística", "Equipamiento", "Otros"];
const IVA_OPCIONES = [{ label: "Sin IVA (0%)", value: 0 }, { label: "10.5%", value: 0.105 }, { label: "21%", value: 0.21 }];

const emptyForm = {
  proveedorId: "", numeroFactura: "", fechaEmision: "", fechaVencimiento: "",
  montoNeto: "", tasaIva: "0.21", montoIva: "", montoTotal: "",
  concepto: "Insumos", observaciones: "",
};

export default function FacturasProveedoresPage() {
  const router = useRouter();
  const [facturas, setFacturas] = useState<FacturaProveedor[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filtros
  const [proveedorFiltro, setProveedorFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Modal nueva / editar
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Modal pago
  const [pagoFactura, setPagoFactura] = useState<FacturaProveedor | null>(null);
  const [pagoForm, setPagoForm] = useState({ monto: "", tipoPago: "TRANSFERENCIA", referencia: "", fechaPago: "", observaciones: "" });
  const [savingPago, setSavingPago] = useState(false);

  const fetchFacturas = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (proveedorFiltro) p.set("proveedorId", proveedorFiltro);
    if (estadoFiltro) p.set("estado", estadoFiltro);
    if (desde) p.set("desde", desde);
    if (hasta) p.set("hasta", hasta);
    const res = await fetch(`/api/proveedores/facturas?${p}`);
    const json = await res.json();
    setFacturas(json.data ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [page, proveedorFiltro, estadoFiltro, desde, hasta]);

  useEffect(() => { fetchFacturas(); }, [fetchFacturas]);
  useEffect(() => {
    fetch("/api/proveedores?pageSize=200").then(r => r.json()).then(j => setProveedores(j.data ?? []));
  }, []);

  // Auto-calcular IVA y total
  function handleNetChange(neto: string) {
    const n = parseFloat(neto) || 0;
    const tasa = parseFloat(form.tasaIva) || 0;
    const iva = n * tasa;
    setForm(f => ({ ...f, montoNeto: neto, montoIva: iva.toFixed(2), montoTotal: (n + iva).toFixed(2) }));
  }
  function handleTasaChange(tasa: string) {
    const n = parseFloat(form.montoNeto) || 0;
    const t = parseFloat(tasa) || 0;
    const iva = n * t;
    setForm(f => ({ ...f, tasaIva: tasa, montoIva: iva.toFixed(2), montoTotal: (n + iva).toFixed(2) }));
  }

  function abrirNueva() { setForm(emptyForm); setEditando(null); setShowModal(true); }
  function abrirEditar(f: FacturaProveedor) {
    const tasa = f.montoNeto > 0 ? (f.montoIva / f.montoNeto).toFixed(3) : "0";
    setForm({
      proveedorId: f.proveedor.id, numeroFactura: f.numeroFactura,
      fechaEmision: f.fechaEmision.split("T")[0],
      fechaVencimiento: f.fechaVencimiento ? f.fechaVencimiento.split("T")[0] : "",
      montoNeto: String(f.montoNeto), tasaIva: tasa,
      montoIva: String(f.montoIva), montoTotal: String(f.montoTotal),
      concepto: f.concepto, observaciones: f.observaciones ?? "",
    } as typeof emptyForm);
    setEditando(f.id); setShowModal(true);
  }

  async function guardar() {
    if (!form.proveedorId || !form.numeroFactura || !form.fechaEmision || !form.montoNeto || !form.concepto)
      return toast({ title: "Completá los campos obligatorios", variant: "destructive" });

    setSaving(true);
    const payload = {
      proveedorId: form.proveedorId, numeroFactura: form.numeroFactura,
      fechaEmision: form.fechaEmision,
      fechaVencimiento: form.fechaVencimiento || null,
      montoNeto: parseFloat(form.montoNeto), montoIva: parseFloat(form.montoIva) || 0,
      montoTotal: parseFloat(form.montoTotal), concepto: form.concepto,
      observaciones: form.observaciones || null,
    };

    const res = await fetch(editando ? `/api/proveedores/facturas/${editando}` : "/api/proveedores/facturas", {
      method: editando ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok) {
      toast({ title: editando ? "Factura actualizada" : "Factura creada" });
      setShowModal(false); fetchFacturas();
    } else {
      toast({ title: "Error", description: typeof json.error === "string" ? json.error : "Error al guardar", variant: "destructive" });
    }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta factura?")) return;
    const res = await fetch(`/api/proveedores/facturas/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (res.ok) { toast({ title: "Factura eliminada" }); fetchFacturas(); }
    else toast({ title: "Error", description: json.error, variant: "destructive" });
  }

  async function registrarPago() {
    if (!pagoFactura || !pagoForm.monto || Number(pagoForm.monto) <= 0)
      return toast({ title: "Ingresá un monto válido", variant: "destructive" });
    setSavingPago(true);
    const res = await fetch(`/api/proveedores/facturas/${pagoFactura.id}/pagar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: Number(pagoForm.monto), tipoPago: pagoForm.tipoPago, referencia: pagoForm.referencia || null, fechaPago: pagoForm.fechaPago || undefined, observaciones: pagoForm.observaciones || null }),
    });
    const json = await res.json();
    setSavingPago(false);
    if (res.ok) { toast({ title: "Pago registrado" }); setPagoFactura(null); fetchFacturas(); }
    else toast({ title: "Error", description: json.error, variant: "destructive" });
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas de Proveedores</h1>
          <p className="text-gray-500 text-sm mt-1">{total} factura{total !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={abrirNueva}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Factura
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Proveedor</label>
              <Select value={proveedorFiltro} onValueChange={(v) => { setProveedorFiltro(v === "todos" ? "" : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Estado</label>
              <Select value={estadoFiltro} onValueChange={(v) => { setEstadoFiltro(v === "todos" ? "" : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="PARCIALMENTE_PAGADA">Parcial</SelectItem>
                  <SelectItem value="PAGADA">Pagada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Desde</label>
              <Input type="date" value={desde} onChange={e => { setDesde(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Hasta</label>
              <Input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setPage(1); }} />
            </div>
          </div>
          {(proveedorFiltro || estadoFiltro || desde || hasta) && (
            <button onClick={() => { setProveedorFiltro(""); setEstadoFiltro(""); setDesde(""); setHasta(""); setPage(1); }} className="mt-2 text-xs text-pink-600 hover:underline">
              Limpiar filtros
            </button>
          )}
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-pink-600" /> Facturas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
          ) : facturas.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No hay facturas</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nº Factura</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Concepto</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Emisión</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map(f => (
                    <tr key={f.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/dashboard/admin/proveedores/facturas/${f.id}`)}>
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">{f.numeroFactura}</td>
                      <td className="px-4 py-3 text-gray-700">{f.proveedor.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{f.concepto}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(f.fechaEmision)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(f.montoTotal)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${f.saldoPendiente > 0 ? "text-red-600" : "text-green-600"}`}>
                        {f.saldoPendiente > 0 ? formatCurrency(f.saldoPendiente) : "Pagada"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={ESTADO_BADGE[f.estadoMostrar] ?? "secondary"}>
                          {ESTADO_LABEL[f.estadoMostrar] ?? f.estadoMostrar}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {f.estado !== "PAGADA" && (
                            <Button size="sm" variant="outline" className="text-green-700 border-green-200 hover:bg-green-50" onClick={() => { setPagoFactura(f); setPagoForm({ monto: String(f.saldoPendiente), tipoPago: "TRANSFERENCIA", referencia: "", fechaPago: "", observaciones: "" }); }}>
                              <CreditCard className="h-3 w-3 mr-1" /> Pagar
                            </Button>
                          )}
                          {f.estado !== "PAGADA" && (
                            <Button size="sm" variant="ghost" onClick={() => abrirEditar(f)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {f.estado !== "PAGADA" && (
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => eliminar(f.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nueva / Editar Factura */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Factura" : "Nueva Factura de Proveedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Proveedor *</Label>
                <Select value={form.proveedorId} onValueChange={v => setForm(f => ({ ...f, proveedorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccioná proveedor" /></SelectTrigger>
                  <SelectContent>
                    {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nº Factura *</Label>
                <Input placeholder="F-2026-001" value={form.numeroFactura} onChange={e => setForm(f => ({ ...f, numeroFactura: e.target.value }))} />
              </div>
              <div>
                <Label>Concepto *</Label>
                <Select value={form.concepto} onValueChange={v => setForm(f => ({ ...f, concepto: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONCEPTOS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha Emisión *</Label>
                <Input type="date" value={form.fechaEmision} onChange={e => setForm(f => ({ ...f, fechaEmision: e.target.value }))} />
              </div>
              <div>
                <Label>Fecha Vencimiento</Label>
                <Input type="date" value={form.fechaVencimiento} onChange={e => setForm(f => ({ ...f, fechaVencimiento: e.target.value }))} />
              </div>
              <div>
                <Label>Monto Neto *</Label>
                <Input type="number" placeholder="0.00" value={form.montoNeto} onChange={e => handleNetChange(e.target.value)} />
              </div>
              <div>
                <Label>IVA</Label>
                <Select value={form.tasaIva} onValueChange={handleTasaChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{IVA_OPCIONES.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monto IVA</Label>
                <Input type="number" placeholder="0.00" value={form.montoIva} onChange={e => setForm(f => ({ ...f, montoIva: e.target.value, montoTotal: String((parseFloat(f.montoNeto) || 0) + (parseFloat(e.target.value) || 0)) }))} />
              </div>
              <div>
                <Label>Total</Label>
                <Input type="number" placeholder="0.00" value={form.montoTotal} readOnly className="bg-gray-50 font-semibold" />
              </div>
              <div className="col-span-2">
                <Label>Observaciones</Label>
                <Input placeholder="Notas..." value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={guardar} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Pago */}
      <Dialog open={!!pagoFactura} onOpenChange={() => setPagoFactura(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago — {pagoFactura?.numeroFactura}</DialogTitle>
          </DialogHeader>
          {pagoFactura && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Proveedor</span><span className="font-medium">{pagoFactura.proveedor.nombre}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total factura</span><span>{formatCurrency(pagoFactura.montoTotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Saldo pendiente</span><span className="font-bold text-red-600">{formatCurrency(pagoFactura.saldoPendiente)}</span></div>
              </div>
              <div>
                <Label>Monto a pagar *</Label>
                <Input type="number" value={pagoForm.monto} onChange={e => setPagoForm(f => ({ ...f, monto: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <Label>Tipo de pago *</Label>
                <div className="flex gap-2 mt-1">
                  {["EFECTIVO", "TRANSFERENCIA", "CHEQUE"].map(t => (
                    <button key={t} type="button" onClick={() => setPagoForm(f => ({ ...f, tipoPago: t }))}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 text-xs font-medium transition-colors ${pagoForm.tipoPago === t ? "border-pink-600 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fecha de pago</Label>
                  <Input type="date" value={pagoForm.fechaPago} onChange={e => setPagoForm(f => ({ ...f, fechaPago: e.target.value }))} />
                </div>
                <div>
                  <Label>Referencia</Label>
                  <Input placeholder="CBU, cheque..." value={pagoForm.referencia} onChange={e => setPagoForm(f => ({ ...f, referencia: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Observaciones</Label>
                <Input placeholder="Notas..." value={pagoForm.observaciones} onChange={e => setPagoForm(f => ({ ...f, observaciones: e.target.value }))} />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setPagoFactura(null)}>Cancelar</Button>
                <Button onClick={registrarPago} disabled={savingPago}>{savingPago ? "Guardando..." : "Registrar pago"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
