"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, Building2 } from "lucide-react";

interface Pago { id: string; monto: number; tipoPago: string; fechaPago: string; referencia: string | null; observaciones: string | null; usuario: { nombre: string } }
interface FacturaDetalle {
  id: string; numeroFactura: string; concepto: string;
  proveedor: { id: string; nombre: string; email: string | null; telefono: string | null };
  fechaEmision: string; fechaVencimiento: string | null;
  montoNeto: number; montoIva: number; montoTotal: number;
  estado: string; estadoMostrar: string;
  saldoPendiente: number; totalPagado: number;
  observaciones: string | null;
  pagos: Pago[];
}

const ESTADO_BADGE: Record<string, "destructive" | "warning" | "success" | "secondary"> = {
  PENDIENTE: "destructive", PARCIALMENTE_PAGADA: "warning", PAGADA: "success", VENCIDA: "destructive",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente", PARCIALMENTE_PAGADA: "Parcial", PAGADA: "Pagada", VENCIDA: "Vencida",
};

export default function DetalleFacturaProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [factura, setFactura] = useState<FacturaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPago, setShowPago] = useState(false);
  const [pagoForm, setPagoForm] = useState({ monto: "", tipoPago: "TRANSFERENCIA", referencia: "", fechaPago: "", observaciones: "" });
  const [savingPago, setSavingPago] = useState(false);

  async function cargar() {
    setLoading(true);
    const res = await fetch(`/api/proveedores/facturas/${id}`);
    const json = await res.json();
    setFactura(json.data ?? null);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, [id]);

  async function registrarPago() {
    if (!pagoForm.monto || Number(pagoForm.monto) <= 0)
      return toast({ title: "Ingresá un monto válido", variant: "destructive" });
    setSavingPago(true);
    const res = await fetch(`/api/proveedores/facturas/${id}/pagar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: Number(pagoForm.monto), tipoPago: pagoForm.tipoPago, referencia: pagoForm.referencia || null, fechaPago: pagoForm.fechaPago || undefined, observaciones: pagoForm.observaciones || null }),
    });
    const json = await res.json();
    setSavingPago(false);
    if (res.ok) { toast({ title: "Pago registrado" }); setShowPago(false); cargar(); }
    else toast({ title: "Error", description: json.error, variant: "destructive" });
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Cargando...</div>;
  if (!factura) return <div className="py-20 text-center text-gray-400">Factura no encontrada.</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/admin/proveedores/facturas")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Factura {factura.numeroFactura}</h1>
          <p className="text-gray-500 text-sm">{factura.proveedor.nombre} · {formatDate(factura.fechaEmision)}</p>
        </div>
        <Badge variant={ESTADO_BADGE[factura.estadoMostrar] ?? "secondary"} className="text-sm px-3 py-1">
          {ESTADO_LABEL[factura.estadoMostrar] ?? factura.estadoMostrar}
        </Badge>
        {factura.estado !== "PAGADA" && (
          <Button onClick={() => { setShowPago(true); setPagoForm(f => ({ ...f, monto: String(factura.saldoPendiente) })); }}>
            <CreditCard className="h-4 w-4 mr-2" /> Registrar Pago
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Datos proveedor */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />Proveedor</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold text-gray-900">{factura.proveedor.nombre}</p>
            {factura.proveedor.email && <p className="text-gray-500">{factura.proveedor.email}</p>}
            {factura.proveedor.telefono && <p className="text-gray-500">{factura.proveedor.telefono}</p>}
          </CardContent>
        </Card>

        {/* Datos factura */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Detalle</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Concepto</span><span className="font-medium">{factura.concepto}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Emisión</span><span>{formatDate(factura.fechaEmision)}</span></div>
            {factura.fechaVencimiento && <div className="flex justify-between"><span className="text-gray-500">Vencimiento</span><span className={factura.estadoMostrar === "VENCIDA" ? "text-red-600 font-semibold" : ""}>{formatDate(factura.fechaVencimiento)}</span></div>}
            {factura.observaciones && <div className="flex justify-between"><span className="text-gray-500">Notas</span><span className="text-right max-w-[60%]">{factura.observaciones}</span></div>}
          </CardContent>
        </Card>
      </div>

      {/* Montos */}
      <Card>
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <tbody>
              {factura.montoIva > 0 && <>
                <tr className="border-b border-gray-50"><td className="py-2 text-gray-500">Neto</td><td className="py-2 text-right">{formatCurrency(factura.montoNeto)}</td></tr>
                <tr className="border-b border-gray-50"><td className="py-2 text-gray-500">IVA</td><td className="py-2 text-right">{formatCurrency(factura.montoIva)}</td></tr>
              </>}
              <tr className="border-b border-gray-100"><td className="py-2 font-bold">Total</td><td className="py-2 text-right font-bold text-lg">{formatCurrency(factura.montoTotal)}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 text-green-600">Pagado</td><td className="py-2 text-right text-green-600">{formatCurrency(factura.totalPagado)}</td></tr>
              <tr><td className="py-2 font-semibold text-red-600">Saldo pendiente</td><td className="py-2 text-right font-bold text-red-600">{formatCurrency(factura.saldoPendiente)}</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Historial de pagos */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Pagos registrados</CardTitle></CardHeader>
        <CardContent className="p-0">
          {factura.pagos.length === 0 ? (
            <p className="py-8 text-center text-gray-400 text-sm">Sin pagos registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Referencia</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Monto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
              </tr></thead>
              <tbody>
                {factura.pagos.map(p => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="px-4 py-3">{formatDate(p.fechaPago)}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{p.tipoPago}</Badge></td>
                    <td className="px-4 py-3 text-gray-500">{p.referencia ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(p.monto)}</td>
                    <td className="px-4 py-3 text-gray-500">{p.usuario.nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modal Pago */}
      <Dialog open={showPago} onOpenChange={setShowPago}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pago — {factura.numeroFactura}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Saldo pendiente</span><span className="font-bold text-red-600">{formatCurrency(factura.saldoPendiente)}</span></div>
            </div>
            <div><Label>Monto *</Label><Input type="number" value={pagoForm.monto} onChange={e => setPagoForm(f => ({ ...f, monto: e.target.value }))} /></div>
            <div>
              <Label>Tipo de pago *</Label>
              <div className="flex gap-2 mt-1">
                {["EFECTIVO", "TRANSFERENCIA", "CHEQUE"].map(t => (
                  <button key={t} type="button" onClick={() => setPagoForm(f => ({ ...f, tipoPago: t }))}
                    className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium ${pagoForm.tipoPago === t ? "border-pink-600 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fecha</Label><Input type="date" value={pagoForm.fechaPago} onChange={e => setPagoForm(f => ({ ...f, fechaPago: e.target.value }))} /></div>
              <div><Label>Referencia</Label><Input placeholder="CBU, cheque..." value={pagoForm.referencia} onChange={e => setPagoForm(f => ({ ...f, referencia: e.target.value }))} /></div>
            </div>
            <div><Label>Observaciones</Label><Input value={pagoForm.observaciones} onChange={e => setPagoForm(f => ({ ...f, observaciones: e.target.value }))} /></div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowPago(false)}>Cancelar</Button>
              <Button onClick={registrarPago} disabled={savingPago}>{savingPago ? "Guardando..." : "Registrar pago"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
