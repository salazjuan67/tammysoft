"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Edit2, Save, RefreshCw, TrendingUp, TrendingDown, ClipboardPaste } from "lucide-react";
import type { Categoria } from "@/types";

interface ProductoConCategoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: string;
  precio: number;
  activo: boolean;
  categoria: Categoria;
}

export default function ProductosAdminPage() {
  const [productos, setProductos] = useState<ProductoConCategoria[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<ProductoConCategoria | null>(null);
  const [modoPreciosMasivos, setModoPreciosMasivos] = useState(false);
  const [preciosEditados, setPreciosEditados] = useState<Record<string, string>>({});
  const [savingMasivo, setSavingMasivo] = useState(false);
  const [porcentaje, setPorcentaje] = useState("5");
  const [pastText, setPastText] = useState("");
  const [pastPreview, setPastPreview] = useState<{ nombre: string; precioAnterior: number; precioNuevo: number; encontrado: boolean; productoId: string | null }[]>([]);
  const [showPaste, setShowPaste] = useState(false);

  // Form fields
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [precio, setPrecio] = useState("");
  const [savingForm, setSavingForm] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/productos?activos=false${filtroCategoria ? `&categoriaId=${filtroCategoria}` : ""}${search ? `&search=${search}` : ""}`),
        fetch("/api/productos?activos=false").then(() => fetch("/api/clientes?pageSize=1")), // hack to get categorias
      ]);

      // Cargar categorías desde DB
      const catFromDB = await fetch("/api/clientes?pageSize=0").then(async () => {
        // Fetch categorias separately
        const r = await fetch("/api/productos?activos=false");
        const j = await r.json();
        const cats = new Map<string, Categoria>();
        (j.data ?? []).forEach((p: ProductoConCategoria) => {
          if (p.categoria) cats.set(p.categoria.id, p.categoria);
        });
        return Array.from(cats.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
      });

      const prodJson = await prodRes.json();
      setProductos(prodJson.data ?? []);
      setCategorias(catFromDB);
    } finally {
      setLoading(false);
    }
  }, [filtroCategoria, search]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirNuevo() {
    setEditando(null);
    setNombre(""); setDescripcion(""); setCategoriaId(""); setPrecio("");
    setShowForm(true);
  }

  function abrirEditar(p: ProductoConCategoria) {
    setEditando(p);
    setNombre(p.nombre); setDescripcion(p.descripcion ?? "");
    setCategoriaId(p.categoriaId); setPrecio(String(p.precio));
    setShowForm(true);
  }

  async function guardar() {
    if (!nombre || !categoriaId || !precio) {
      toast({ title: "Completá todos los campos requeridos", variant: "destructive" }); return;
    }
    setSavingForm(true);
    try {
      const body = { nombre, descripcion, categoriaId, precio: Number(precio), activo: true };
      const url = editando ? `/api/productos/${editando.id}` : "/api/productos";
      const method = editando ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (res.ok) {
        toast({ title: editando ? "Producto actualizado" : "Producto creado" });
        setShowForm(false);
        cargar();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setSavingForm(false);
    }
  }

  async function guardarPreciosMasivos() {
    const items = Object.entries(preciosEditados)
      .filter(([, v]) => v && Number(v) > 0)
      .map(([productoId, precio]) => ({ productoId, precio: Number(precio) }));

    if (items.length === 0) {
      toast({ title: "No hay precios modificados", variant: "destructive" }); return;
    }

    setSavingMasivo(true);
    try {
      const res = await fetch("/api/productos/precios-masivos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: json.message });
        setPreciosEditados({});
        setModoPreciosMasivos(false);
        cargar();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setSavingMasivo(false);
    }
  }

  function aplicarPorcentaje(signo: 1 | -1) {
    const pct = parseFloat(porcentaje) / 100;
    if (!pct || pct <= 0) return;
    const nuevos: Record<string, string> = {};
    productosFiltradosCalc.forEach((p) => {
      const base = parseFloat(preciosEditados[p.id] ?? String(p.precio));
      const nuevo = base * (1 + signo * pct);
      nuevos[p.id] = nuevo.toFixed(2);
    });
    setPreciosEditados((prev) => ({ ...prev, ...nuevos }));
  }

  function analizarPaste() {
    const lineas = pastText.split("\n").map(l => l.trim()).filter(Boolean);
    const preview = lineas.map(linea => {
      // Acepta: "nombre,precio" | "nombre precio" | "nombre: precio" | "$precio"
      const match = linea.match(/^(.+?)[\s,:\t]+\$?(\d+(?:[.,]\d+)?)$/) ??
                    linea.match(/^\$?(\d+(?:[.,]\d+)?)$/);
      if (!match) return null;
      const precioStr = match[2] ?? match[1];
      const nombre = match[2] ? match[1].trim() : "";
      const precioNuevo = parseFloat(precioStr.replace(",", "."));
      if (!precioNuevo || precioNuevo <= 0) return null;

      const encontrado = nombre
        ? productos.find(p => p.nombre.toLowerCase().includes(nombre.toLowerCase()))
        : null;

      return {
        nombre: encontrado?.nombre ?? nombre,
        precioAnterior: encontrado ? Number(encontrado.precio) : 0,
        precioNuevo,
        encontrado: !!encontrado,
        productoId: encontrado?.id ?? null,
      };
    }).filter(Boolean) as { nombre: string; precioAnterior: number; precioNuevo: number; encontrado: boolean; productoId: string | null }[];

    setPastPreview(preview);
  }

  async function guardarDesdeClipboard() {
    const items = pastPreview
      .filter(p => p.encontrado && p.productoId)
      .map(p => ({ productoId: p.productoId!, precio: p.precioNuevo }));
    if (items.length === 0) { toast({ title: "Sin productos reconocidos", variant: "destructive" }); return; }
    setSavingMasivo(true);
    const res = await fetch("/api/productos/precios-masivos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const json = await res.json();
    setSavingMasivo(false);
    if (res.ok) {
      toast({ title: json.message });
      setPastText(""); setPastPreview([]); setShowPaste(false);
      cargar();
    } else {
      toast({ title: "Error", description: json.error, variant: "destructive" });
    }
  }

  const productosFiltradosCalc = productos.filter((p) =>
    search ? p.nombre.toLowerCase().includes(search.toLowerCase()) : true
  );

  const productosFiltrados = productosFiltradosCalc;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500 text-sm">{productos.length} productos</p>
        </div>
        <div className="flex gap-2">
          {modoPreciosMasivos ? (
            <>
              <Button variant="outline" onClick={() => { setModoPreciosMasivos(false); setPreciosEditados({}); }}>
                Cancelar
              </Button>
              <Button onClick={guardarPreciosMasivos} disabled={savingMasivo}>
                <Save className="h-4 w-4" />
                {savingMasivo ? "Guardando..." : `Guardar ${Object.keys(preciosEditados).length} precios`}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setModoPreciosMasivos(true)}>
                <RefreshCw className="h-4 w-4" />
                Precios masivos
              </Button>
              <Button onClick={abrirNuevo}><Plus className="h-4 w-4" /> Nuevo producto</Button>
            </>
          )}
        </div>
      </div>

      {modoPreciosMasivos && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 space-y-4">
            <p className="text-sm text-blue-700 font-medium">
              Modo precios masivos: editá directamente en la tabla o usá las herramientas rápidas.
            </p>
            {/* % rápido */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-blue-700 font-medium">Ajuste % a productos filtrados:</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number" min="0.1" max="100" step="0.1"
                  className="w-20 h-8 text-sm"
                  value={porcentaje}
                  onChange={e => setPorcentaje(e.target.value)}
                />
                <span className="text-sm text-blue-700">%</span>
              </div>
              <Button size="sm" variant="outline" className="text-green-700 border-green-300 h-8" onClick={() => aplicarPorcentaje(1)}>
                <TrendingUp className="h-3.5 w-3.5 mr-1" /> Aumentar
              </Button>
              <Button size="sm" variant="outline" className="text-red-700 border-red-300 h-8" onClick={() => aplicarPorcentaje(-1)}>
                <TrendingDown className="h-3.5 w-3.5 mr-1" /> Disminuir
              </Button>
              <Button size="sm" variant="outline" className="text-violet-700 border-violet-300 h-8" onClick={() => setShowPaste(!showPaste)}>
                <ClipboardPaste className="h-3.5 w-3.5 mr-1" /> Pegar lista
              </Button>
            </div>

            {/* Copy-paste section */}
            {showPaste && (
              <div className="space-y-3 border-t border-blue-200 pt-3">
                <p className="text-xs text-blue-600">Pegá los precios (formato: <code className="bg-white px-1 rounded">Producto, precio</code> — una línea por producto):</p>
                <textarea
                  value={pastText}
                  onChange={e => { setPastText(e.target.value); setPastPreview([]); }}
                  rows={6}
                  placeholder={"Mini Torta Frutos, 15\nMousse Chocolate, 12\nBrownie, 10"}
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono resize-none bg-white"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={analizarPaste}>Analizar</Button>
                  {pastPreview.length > 0 && (
                    <Button size="sm" onClick={guardarDesdeClipboard} disabled={savingMasivo}>
                      {savingMasivo ? "Guardando..." : `Guardar ${pastPreview.filter(p => p.encontrado).length} precios`}
                    </Button>
                  )}
                </div>
                {pastPreview.length > 0 && (
                  <div className="rounded-lg border border-blue-200 overflow-hidden text-sm">
                    <table className="w-full">
                      <thead><tr className="bg-blue-100 text-xs text-blue-700">
                        <th className="text-left px-3 py-2">Producto</th>
                        <th className="text-right px-3 py-2">Anterior</th>
                        <th className="text-right px-3 py-2">Nuevo</th>
                        <th className="text-center px-3 py-2">Estado</th>
                      </tr></thead>
                      <tbody>
                        {pastPreview.map((p, i) => (
                          <tr key={i} className={`border-t border-blue-100 ${p.encontrado ? "bg-white" : "bg-red-50"}`}>
                            <td className="px-3 py-2">{p.nombre}</td>
                            <td className="px-3 py-2 text-right text-gray-400">{p.encontrado ? formatCurrency(p.precioAnterior) : "—"}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatCurrency(p.precioNuevo)}</td>
                            <td className="px-3 py-2 text-center">
                              {p.encontrado
                                ? <Badge variant="success" className="text-xs">✓</Badge>
                                : <Badge variant="destructive" className="text-xs">No encontrado</Badge>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar producto..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las categorías</SelectItem>
                {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Cargando...</div>
          ) : productosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No hay productos</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Precio</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    {!modoPreciosMasivos && <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((prod) => (
                    <tr key={prod.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{prod.nombre}</p>
                        {prod.descripcion && <p className="text-xs text-gray-500">{prod.descripcion}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{prod.categoria?.nombre}</td>
                      <td className="px-4 py-3 text-right">
                        {modoPreciosMasivos ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-28 text-right ml-auto"
                            value={preciosEditados[prod.id] ?? Number(prod.precio).toFixed(2)}
                            onChange={(e) => setPreciosEditados((prev) => ({ ...prev, [prod.id]: e.target.value }))}
                          />
                        ) : (
                          <span className="font-semibold">{formatCurrency(Number(prod.precio))}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={prod.activo ? "success" : "secondary"}>{prod.activo ? "Activo" : "Inactivo"}</Badge>
                      </td>
                      {!modoPreciosMasivos && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Button variant="ghost" size="icon" onClick={() => abrirEditar(prod)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
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
            <DialogTitle>{editando ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Mousse de Chocolate" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción breve (opcional)" />
            </div>
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Precio *</Label>
              <Input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0.00" />
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
