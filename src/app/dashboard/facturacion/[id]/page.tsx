"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, RotateCcw, Trash2, FileText, User, Package } from "lucide-react";

interface FacturaDetalle {
  id: string;
  numero: number;
  fecha: string;
  montoTotal: string | number;
  montoNeto: string | number;
  montoIva: string | number;
  tasaIva: string | number;
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

  useEffect(() => {
    fetch(`/api/facturas/${id}`)
      .then((r) => r.json())
      .then((j) => { setFactura(j.data); setLoading(false); })
      .catch(() => { toast({ title: "Error al cargar factura", variant: "destructive" }); setLoading(false); });
  }, [id]);

  async function cambiarEstado(nuevoEstado: "cobrada" | "sin-cobrar") {
    setUpdating(true);
    const res = await fetch(`/api/facturas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: "Error", description: json.error, variant: "destructive" });
    } else {
      toast({ title: nuevoEstado === "cobrada" ? "Factura marcada como cobrada" : "Factura marcada como sin cobrar" });
      setFactura((prev) => prev ? { ...prev, estado: json.data.estado } : prev);
    }
    setUpdating(false);
  }

  async function anularFactura() {
    setUpdating(true);
    const res = await fetch(`/api/facturas/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: "Error", description: json.error, variant: "destructive" });
      setUpdating(false);
    } else {
      toast({ title: "Factura anulada" });
      router.push("/dashboard/facturacion");
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
            {!esCobrada ? (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => cambiarEstado("cobrada")}
                disabled={updating}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar cobrada
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => cambiarEstado("sin-cobrar")}
                disabled={updating}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Marcar sin cobrar
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={updating}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Anular
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Anular factura?</AlertDialogTitle>
                  <AlertDialogDescription>
                    La factura FAC-{String(factura.numero).padStart(5, "0")} quedará como anulada.
                    Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={anularFactura}>
                    Sí, anular
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
          {!esAnulada && !esCobrada && (
            <p className="text-sm text-red-600 mt-2">
              Monto pendiente de cobro: <strong>{formatCurrency(Number(factura.montoTotal))}</strong>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
