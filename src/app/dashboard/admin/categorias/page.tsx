"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit2 } from "lucide-react";

interface CategoriaConCount {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  _count: { productos: number };
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<CategoriaConCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<CategoriaConCount | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [orden, setOrden] = useState("0");
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/categorias");
    const json = await res.json();
    setCategorias(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirNuevo() {
    setEditando(null);
    setNombre(""); setDescripcion(""); setOrden("0");
    setShowForm(true);
  }

  function abrirEditar(c: CategoriaConCount) {
    setEditando(c);
    setNombre(c.nombre); setDescripcion(c.descripcion ?? ""); setOrden(String(c.orden));
    setShowForm(true);
  }

  async function guardar() {
    if (!nombre.trim()) { toast({ title: "El nombre es requerido", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const body = { nombre, descripcion, orden: Number(orden), activo: true };
      const url = editando ? `/api/categorias/${editando.id}` : "/api/categorias";
      const method = editando ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (res.ok) {
        toast({ title: editando ? "Categoría actualizada" : "Categoría creada" });
        setShowForm(false);
        cargar();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
        <Button onClick={abrirNuevo}><Plus className="h-4 w-4" /> Nueva categoría</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Orden</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Productos</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{c.descripcion ?? "-"}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{c.orden}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">{c._count.productos}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => abrirEditar(c)}>
                          <Edit2 className="h-4 w-4" />
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Mousses" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción breve" />
            </div>
            <div className="space-y-2">
              <Label>Orden de visualización</Label>
              <Input type="number" min="0" value={orden} onChange={(e) => setOrden(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={guardar} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
