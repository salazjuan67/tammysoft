"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Plus, CreditCard, Wallet } from "lucide-react";

interface Proveedor {
  id: string;
  nombre: string;
  contacto: string | null;
  email: string | null;
  telefono: string | null;
  deudaActual: number;
  _count: { pagos: number };
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormProv, setShowFormProv] = useState(false);
  const [showFormPago, setShowFormPago] = useState(false);
  const [provSeleccionado, setProvSeleccionado] = useState<Proveedor | null>(null);

  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  const [montoPago, setMontoPago] = useState("");
  const [tipoPago, setTipoPago] = useState<"EFECTIVO" | "TRANSFERENCIA">("TRANSFERENCIA");
  const [concepto, setConcepto] = useState("");
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/proveedores");
    const json = await res.json();
    setProveedores(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardarProveedor() {
    if (!nombre.trim()) { toast({ title: "El nombre es requerido", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, contacto, email, telefono }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: "Proveedor creado" });
        setShowFormProv(false);
        cargar();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function registrarPago() {
    if (!provSeleccionado || !montoPago || Number(montoPago) <= 0) {
      toast({ title: "Ingresá un monto válido", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/proveedores/${provSeleccionado.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: Number(montoPago), tipoPago, concepto }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: "Pago registrado" });
        setShowFormPago(false);
        cargar();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  const deudaTotal = proveedores.reduce((acc, p) => acc + Number(p.deudaActual), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-gray-500 text-sm">Deuda total: <span className="font-bold text-red-600">{formatCurrency(deudaTotal)}</span></p>
        </div>
        <Button onClick={() => { setNombre(""); setContacto(""); setEmail(""); setTelefono(""); setShowFormProv(true); }}>
          <Plus className="h-4 w-4" /> Nuevo proveedor
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Cargando...</div>
          ) : proveedores.length === 0 ? (
            <div className="py-12 text-center text-gray-500">Sin proveedores</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Deuda actual</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {proveedores.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.nombre}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {p.contacto && <div>{p.contacto}</div>}
                        {p.email && <div>{p.email}</div>}
                        {p.telefono && <div>{p.telefono}</div>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        {formatCurrency(Number(p.deudaActual))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setProvSeleccionado(p);
                            setMontoPago(""); setConcepto("");
                            setShowFormPago(true);
                          }}
                        >
                          <Plus className="h-3 w-3" /> Registrar pago
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

      <Dialog open={showFormProv} onOpenChange={setShowFormProv}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo proveedor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
            <div className="space-y-2"><Label>Contacto</Label><Input value={contacto} onChange={(e) => setContacto(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Teléfono</Label><Input value={telefono} onChange={(e) => setTelefono(e.target.value)} /></div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowFormProv(false)}>Cancelar</Button>
              <Button onClick={guardarProveedor} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFormPago} onOpenChange={setShowFormPago}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pago a {provSeleccionado?.nombre}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto *</Label>
              <Input type="number" min="0" step="0.01" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de pago</Label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setTipoPago("EFECTIVO")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${tipoPago === "EFECTIVO" ? "border-pink-600 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600"}`}>
                  <Wallet className="h-4 w-4" /> Efectivo
                </button>
                <button type="button" onClick={() => setTipoPago("TRANSFERENCIA")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${tipoPago === "TRANSFERENCIA" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}>
                  <CreditCard className="h-4 w-4" /> Transferencia
                </button>
              </div>
            </div>
            <div className="space-y-2"><Label>Concepto</Label><Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Descripción del pago" /></div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowFormPago(false)}>Cancelar</Button>
              <Button onClick={registrarPago} disabled={saving}>{saving ? "Registrando..." : "Registrar pago"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
