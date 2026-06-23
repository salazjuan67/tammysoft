"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Edit2, UserX, UserCheck, Phone, Mail } from "lucide-react";
import type { Cliente } from "@/types";

export default function ClientesAdminPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  // Form fields
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");
  const [savingForm, setSavingForm] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        activos: String(soloActivos),
        ...(search && { search }),
        pageSize: "100",
      });
      const res = await fetch(`/api/clientes?${params}`);
      const json = await res.json();
      setClientes(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [soloActivos, search]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirNuevo() {
    setEditando(null);
    setNombre(""); setEmail(""); setTelefono(""); setDireccion(""); setNotas("");
    setShowForm(true);
  }

  function abrirEditar(c: Cliente) {
    setEditando(c);
    setNombre(c.nombre); setEmail(c.email ?? ""); setTelefono(c.telefono ?? "");
    setDireccion(c.direccion ?? ""); setNotas(c.notas ?? "");
    setShowForm(true);
  }

  async function guardar() {
    if (!nombre.trim()) { toast({ title: "El nombre es requerido", variant: "destructive" }); return; }
    setSavingForm(true);
    try {
      const body = { nombre: nombre.trim(), email: email || undefined, telefono, direccion, notas, estado: true };
      const url = editando ? `/api/clientes/${editando.id}` : "/api/clientes";
      const method = editando ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (res.ok) {
        toast({ title: editando ? "Cliente actualizado" : "Cliente creado" });
        setShowForm(false);
        cargar();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setSavingForm(false);
    }
  }

  async function toggleEstado(c: Cliente) {
    const res = await fetch(`/api/clientes/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, estado: !c.estado }),
    });
    if (res.ok) { cargar(); toast({ title: c.estado ? "Cliente desactivado" : "Cliente activado" }); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm">{total} clientes</p>
        </div>
        <Button onClick={abrirNuevo}><Plus className="h-4 w-4" /> Nuevo cliente</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por nombre, email, teléfono..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button
              type="button"
              onClick={() => setSoloActivos(!soloActivos)}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${soloActivos ? "bg-green-50 border-green-300 text-green-700" : "bg-gray-50 border-gray-300 text-gray-700"}`}
            >
              {soloActivos ? "Solo activos" : "Todos"}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Cargando...</div>
          ) : clientes.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No hay clientes</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Dirección</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="space-y-0.5">
                          {c.email && <div className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{c.email}</div>}
                          {c.telefono && <div className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{c.telefono}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{c.direccion ?? "-"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={c.estado ? "success" : "secondary"}>{c.estado ? "Activo" : "Inactivo"}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirEditar(c)} title="Editar">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => toggleEstado(c)} title={c.estado ? "Desactivar" : "Activar"}>
                            {c.estado ? <UserX className="h-4 w-4 text-red-500" /> : <UserCheck className="h-4 w-4 text-green-500" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo o razón social" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@ejemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+54 11 xxxx-xxxx" />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, barrio" />
            </div>
            <div className="space-y-2">
              <Label>Notas internas</Label>
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..." />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={guardar} disabled={savingForm}>{savingForm ? "Guardando..." : "Guardar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
