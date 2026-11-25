"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, User, Package, Receipt, Wallet, CreditCard, Printer, Landmark, FileMinus2 } from "lucide-react";

interface NotaCredito {
  id: string;
  numero: number;
  monto: number;
  motivo: string | null;
  fecha: string;
  comprobanteArca: string | null;
}

interface FacturaDetalle {
  id: string;
  numero: number;
  fecha: string;
  montoTotal: string | number;
  montoNeto: string | number;
  montoIva: string | number;
  tasaIva: string | number;
  totalPagado: number;
  totalCreditos: number;
  ivaArcaAdicional: number;
  montoACobrar: number;
  saldoPendiente: number;
  porcentajeArca: number;
  tasaIvaArca: number;
  facturadoArca: boolean;
  comprobanteArca: string | null;
  fechaArca: string | null;
  arca: { total: number; neto: number; iva: number };
  pagos: { id: string; monto: number; tipoPago: string; fechaPago: string; observaciones: string | null }[];
  notasCredito: NotaCredito[];
  estado: "PENDIENTE" | "PARCIALMENTE_COBRADA" | "COBRADA" | "ANULADA";
  cliente: { id: string; nombre: string; email: string | null; telefono: string | null };
  pedido: {
    id: string;
    rangoHorario: string;
    items: {
      id: string;
      cantidad: number;
      precioUnitario: string | number;
      subtotal: string | number;
      producto: { id: string; nombre: string };
    }[];
  };
}

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: "Sin cobrar",
  PARCIALMENTE_COBRADA: "Parcialmente cobrada",
  COBRADA: "Cobrada",
  ANULADA: "Anulada",
};

const ESTADO_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  PENDIENTE: "destructive",
  PARCIALMENTE_COBRADA: "warning",
  COBRADA: "success",
  ANULADA: "secondary",
};

export default function DetalleFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [factura, setFactura] = useState<FacturaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [ncOpen, setNcOpen] = useState(false);
  const [ncTotal, setNcTotal] = useState(true);
  const [ncMonto, setNcMonto] = useState("");
  const [ncMotivo, setNcMotivo] = useState("");
  const [ncComprobante, setNcComprobante] = useState("");

  async function cargarFactura() {
    const res = await fetch(`/api/facturas/${id}`);
    const j = await res.json();
    if (!res.ok) throw new Error(j.error ?? "Error");
    setFactura(j.data);
  }

  useEffect(() => {
    cargarFactura()
      .then(() => setLoading(false))
      .catch(() => { toast({ title: "Error al cargar factura", variant: "destructive" }); setLoading(false); });
  }, [id]);

  function abrirNotaCredito(total: boolean) {
    if (!factura) return;
    setNcTotal(total);
    setNcMonto(total ? String(factura.montoACobrar) : "");
    setNcMotivo(total ? "Anulación total" : "");
    setNcComprobante("");
    setNcOpen(true);
  }

  async function emitirNotaCredito() {
    if (!factura) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/facturas/${id}/notas-credito`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: ncTotal,
          monto: ncTotal ? undefined : Number(ncMonto),
          motivo: ncMotivo || undefined,
          comprobanteArca: ncComprobante || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "No se pudo emitir la NC", description: typeof json.error === "string" ? json.error : undefined, variant: "destructive" });
        return;
      }
      const nota = json.data?.nota;
      toast({
        title: ncTotal ? "Factura anulada con nota de crédito" : "Nota de crédito emitida",
        description: nota ? `NC-${String(nota.numero).padStart(5, "0")} por ${formatCurrency(nota.monto)}` : undefined,
      });
      setNcOpen(false);
      await cargarFactura();
      if (nota?.id) window.open(`/dashboard/facturacion/${id}/nota-credito/${nota.id}`, "_blank");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-gray-400">Cargando...</div>;
  }

  if (!factura) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-gray-500">Factura no encontrada</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/facturacion")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
      </div>
    );
  }

  const esCobrada = factura.estado === "COBRADA";
  const esAnulada = factura.estado === "ANULADA";
  const tieneSaldo = !esAnulada && factura.saldoPendiente > 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/facturacion")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">
                FAC-{String(factura.numero).padStart(5, "0")}
              </h1>
              <Badge variant={ESTADO_VARIANT[factura.estado] ?? "secondary"}>
                {ESTADO_LABELS[factura.estado] ?? factura.estado}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm">{formatDate(factura.fecha)}</p>
          </div>
        </div>

        {/* Actions */}
        {!esAnulada && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open(`/dashboard/facturacion/${factura.id}/remito`, "_blank")}>
              <Printer className="h-4 w-4 mr-2" />
              Remito
            </Button>
            {tieneSaldo && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => router.push(`/dashboard/cobranza?clienteId=${factura.cliente.id}`)}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Cobrar en Cobranza
              </Button>
            )}

            <Button variant="outline" onClick={() => abrirNotaCredito(false)} disabled={updating || factura.montoACobrar <= 0}>
              <FileMinus2 className="h-4 w-4 mr-2" />
              Nota de crédito
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => abrirNotaCredito(true)}
              disabled={updating || factura.montoACobrar <= 0}
            >
              Anular (NC total)
            </Button>
          </div>
        )}
      </div>

      {/* Client info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-gray-600">
            <User className="h-4 w-4" /> Información del cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Nombre</p>
            <p className="font-medium text-gray-900">{factura.cliente.nombre}</p>
          </div>
          {factura.cliente.email && (
            <div>
              <p className="text-gray-500 text-xs">Email</p>
              <p className="font-medium text-gray-900">{factura.cliente.email}</p>
            </div>
          )}
          {factura.cliente.telefono && (
            <div>
              <p className="text-gray-500 text-xs">Teléfono</p>
              <p className="font-medium text-gray-900">{factura.cliente.telefono}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500 text-xs">Pedido asociado</p>
            <p className="font-mono font-medium text-gray-900">{factura.pedido.id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-gray-600">
            <Package className="h-4 w-4" /> Detalle del pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-600">Producto</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Cantidad</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Precio unit.</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {factura.pedido.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 text-gray-900">{item.producto.nombre}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{item.cantidad}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">
                    {formatCurrency(Number(item.precioUnitario))}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                    {formatCurrency(Number(item.subtotal))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {Number(factura.tasaIva) > 0 && (
                <>
                  <tr className="border-t">
                    <td colSpan={3} className="px-4 py-2 text-gray-600 text-right text-sm">
                      Subtotal neto
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-gray-700">
                      {formatCurrency(Number(factura.montoNeto))}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-gray-600 text-right text-sm">
                      IVA {Math.round(Number(factura.tasaIva) * 100)}%
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-gray-700">
                      {formatCurrency(Number(factura.montoIva))}
                    </td>
                  </tr>
                </>
              )}
              <tr className="border-t bg-gray-50">
                <td colSpan={3} className="px-4 py-3 font-semibold text-gray-900 text-right">
                  Total
                </td>
                <td className="px-4 py-3 font-bold text-gray-900 text-right text-base">
                  {formatCurrency(Number(factura.montoTotal))}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* ARCA */}
      {!esAnulada && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between text-gray-600">
              <span className="flex items-center gap-2"><Landmark className="h-4 w-4" /> Facturación ARCA</span>
              {factura.facturadoArca ? (
                <Badge variant="success" className="font-mono">{factura.comprobanteArca}</Badge>
              ) : (
                <Badge variant="secondary">Sin facturar</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-3 text-center text-sm">
            <div>
              <p className="text-gray-500 text-xs">Porcentaje</p>
              <p className="font-bold text-gray-900">{Math.round(factura.porcentajeArca * 10000) / 100}%</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Neto</p>
              <p className="font-bold text-gray-900">{formatCurrency(factura.arca.neto)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">IVA {factura.tasaIvaArca === 0.105 ? "10,5" : "21"}%</p>
              <p className="font-bold text-gray-900">{formatCurrency(factura.arca.iva)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Total ARCA</p>
              <p className="font-bold text-pink-600">{formatCurrency(factura.arca.total)}</p>
            </div>
            {factura.facturadoArca && factura.ivaArcaAdicional > 0 && (
              <p className="col-span-4 text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1.5">
                Al marcarse facturada en ARCA se sumó IVA {formatCurrency(factura.ivaArcaAdicional)} a lo que debe el cliente.
                Total a cobrar: {formatCurrency(Number(factura.montoTotal) + factura.ivaArcaAdicional)}.
              </p>
            )}
            {factura.facturadoArca && factura.fechaArca && (
              <p className="col-span-4 text-xs text-gray-500">Facturada en ARCA el {formatDate(factura.fechaArca)}</p>
            )}
            {!factura.facturadoArca && (
              <p className="col-span-4 text-xs text-gray-500">El porcentaje se define desde el listado de Facturación.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary card */}
      <Card className={esCobrada ? "border-green-200 bg-green-50" : esAnulada ? "border-gray-200 bg-gray-50" : "border-red-200 bg-red-50"}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className={`h-5 w-5 ${esCobrada ? "text-green-600" : esAnulada ? "text-gray-400" : "text-red-500"}`} />
              <span className="font-medium text-gray-900">Estado de cobro</span>
            </div>
            <Badge variant={ESTADO_VARIANT[factura.estado] ?? "secondary"} className="text-sm px-3 py-1">
              {ESTADO_LABELS[factura.estado] ?? factura.estado}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-center text-sm">
            <div>
              <p className="text-gray-500 text-xs">Base</p>
              <p className="font-bold text-gray-900">{formatCurrency(Number(factura.montoTotal))}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">A cobrar</p>
              <p className="font-bold text-gray-900">{formatCurrency(factura.montoACobrar)}</p>
              {factura.ivaArcaAdicional > 0 && (
                <p className="text-[11px] text-amber-700">+ IVA ARCA {formatCurrency(factura.ivaArcaAdicional)}</p>
              )}
              {factura.totalCreditos > 0 && (
                <p className="text-[11px] text-blue-600">− NC {formatCurrency(factura.totalCreditos)}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 text-xs">Cobrado</p>
              <p className="font-bold text-green-600">{formatCurrency(factura.totalPagado)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Saldo pendiente</p>
              <p className="font-bold text-red-600">{formatCurrency(factura.saldoPendiente)}</p>
            </div>
          </div>
          {factura.pagos.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-500">Historial de cobros</p>
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
        </CardContent>
      </Card>

      {/* Notas de crédito */}
      {factura.notasCredito?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-600">
              <FileMinus2 className="h-4 w-4" /> Notas de crédito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {factura.notasCredito.map((nc) => (
              <div key={nc.id} className="flex items-center justify-between text-sm bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                <div>
                  <p className="font-mono font-semibold text-gray-900">NC-{String(nc.numero).padStart(5, "0")}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(nc.fecha)}
                    {nc.motivo ? ` · ${nc.motivo}` : ""}
                    {nc.comprobanteArca ? ` · ARCA ${nc.comprobanteArca}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-700">{formatCurrency(nc.monto)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/dashboard/facturacion/${factura.id}/nota-credito/${nc.id}`, "_blank")}
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Modal NC */}
      <Dialog open={ncOpen} onOpenChange={setNcOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {ncTotal ? "Anular con nota de crédito" : "Nota de crédito parcial"} — FAC-{String(factura.numero).padStart(5, "0")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm">
              <p className="text-blue-800">
                Monto vigente a acreditar: <strong>{formatCurrency(factura.montoACobrar)}</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {ncTotal
                  ? "Se emite una NC por el total restante y la factura queda anulada."
                  : "Podés acreditar solo una parte; el saldo pendiente baja."}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setNcTotal(true); setNcMonto(String(factura.montoACobrar)); setNcMotivo("Anulación total"); }}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium ${ncTotal ? "border-red-600 bg-red-50 text-red-700" : "border-gray-200 text-gray-600"}`}
              >
                Total
              </button>
              <button
                type="button"
                onClick={() => { setNcTotal(false); setNcMonto(""); if (ncMotivo === "Anulación total") setNcMotivo(""); }}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium ${!ncTotal ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
              >
                Parcial
              </button>
            </div>

            {!ncTotal && (
              <div className="space-y-1">
                <Label>Monto a acreditar *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={factura.montoACobrar}
                  value={ncMonto}
                  onChange={(e) => setNcMonto(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label>Motivo</Label>
              <Input value={ncMotivo} onChange={(e) => setNcMotivo(e.target.value)} placeholder="Ej: devolución, error de carga..." />
            </div>

            {factura.facturadoArca && (
              <div className="space-y-1">
                <Label>Comprobante NC en ARCA (opcional)</Label>
                <Input value={ncComprobante} onChange={(e) => setNcComprobante(e.target.value)} placeholder="Ej: 0001-00009999" />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setNcOpen(false)}>Cancelar</Button>
              <Button
                onClick={emitirNotaCredito}
                disabled={updating || (!ncTotal && (!(parseFloat(ncMonto) > 0) || parseFloat(ncMonto) > factura.montoACobrar + 0.005))}
                className={ncTotal ? "bg-red-600 hover:bg-red-700" : undefined}
              >
                {updating ? "Emitiendo..." : ncTotal ? "Emitir NC y anular" : "Emitir NC parcial"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
