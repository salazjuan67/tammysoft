"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Package, Search } from "lucide-react";

interface Insumo {
  id: string;
  nombre: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  bajoMinimo: boolean;
}

export default function InventarioPage() {
  const [items, setItems] = useState<Insumo[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [editMin, setEditMin] = useState("");
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/inventario?${params}`);
    const json = await res.json();
    setItems(json.data ?? []);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(cargar, 200);
    return () => clearTimeout(t);
  }, [cargar]);

  function empezarEdicion(i: Insumo) {
    setEditId(i.id);
    setEditStock(String(i.stockActual));
    setEditMin(String(i.stockMinimo));
  }

  async function guardarAjuste() {
    if (!editId) return;
    setSaving(true);
    const res = await fetch("/api/inventario", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materiaPrimaId: editId,
        stockActual: Number(editStock),
        stockMinimo: Number(editMin),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast({ title: "No se pudo guardar", description: json.error, variant: "destructive" });
      return;
    }
    toast({ title: "Stock actualizado" });
    setEditId(null);
    cargar();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/admin/proveedores/facturas">
              <ArrowLeft className="h-4 w-4 mr-1" /> Facturas
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
            <p className="text-sm text-gray-500">Materia prima acumulada desde facturas de proveedores</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Buscar insumo..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-pink-600" />
            Stock ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Todavía no hay insumos. Cargá una factura de proveedor con ítems.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Insumo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Unidad</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Stock</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Mínimo</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b">
                      <td className="px-4 py-3 font-medium text-gray-900">{i.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{i.unidad}</td>
                      <td className="px-4 py-3 text-right">
                        {editId === i.id ? (
                          <Input className="h-8 w-24 ml-auto text-right" type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} />
                        ) : (
                          <span className="font-semibold">{i.stockActual}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editId === i.id ? (
                          <Input className="h-8 w-24 ml-auto text-right" type="number" value={editMin} onChange={(e) => setEditMin(e.target.value)} />
                        ) : (
                          i.stockMinimo
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {i.bajoMinimo ? (
                          <Badge variant="warning">Bajo mínimo</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editId === i.id ? (
                          <div className="flex justify-center gap-1">
                            <Button size="sm" onClick={guardarAjuste} disabled={saving}>{saving ? "..." : "Guardar"}</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Cancelar</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => empezarEdicion(i)}>Ajustar</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
