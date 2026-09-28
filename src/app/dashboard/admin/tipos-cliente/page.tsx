"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Categoria { id: string; nombre: string; orden: number }
interface Producto { id: string; nombre: string; precio: number; categoria: Categoria }
interface Descuento { productoId: string; descuento: number } // 0-1
interface TipoCliente {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  _count: { clientes: number };
  descuentos: Array<{ productoId: string; descuento: number; producto: Producto }>;
}

export default function TiposClientePage() {
  const [tipos, setTipos] = useState<TipoCliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  // Nuevo tipo
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoDesc, setNuevoDesc] = useState("");
  const [creando, setCreando] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Editar nombre/desc
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Expandir para ver/editar descuentos
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  // descuentos editados en memoria: tipoId → productoId → % (0-100)
  const [descuentosEdit, setDescuentosEdit] = useState<Record<string, Record<string, string>>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [resTipos, resProd] = await Promise.all([
      fetch("/api/tipos-cliente"),
      fetch("/api/productos?activos=true&limit=500"),
    ]);
    const jsonTipos = await resTipos.json();
    const jsonProd = await resProd.json();
    setTipos(jsonTipos.data ?? []);
    setProductos((jsonProd.data ?? []).map((p: { id: string; nombre: string; precio: unknown; categoria: Categoria }) => ({
      ...p, precio: Number(p.precio),
    })));
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Inicializar descuentosEdit cuando se expande un tipo
  function expandir(tipo: TipoCliente) {
    if (expandidoId === tipo.id) { setExpandidoId(null); return; }
    setExpandidoId(tipo.id);
    // Cargar descuentos existentes como porcentaje 0-100
    const mapa: Record<string, string> = {};
    for (const d of tipo.descuentos) {
      mapa[d.productoId] = String(Math.round(Number(d.descuento) * 100));
    }
    setDescuentosEdit((prev) => ({ ...prev, [tipo.id]: mapa }));
  }

  async function crear() {
    if (!nuevoNombre.trim()) return;
    setCreando(true);
    const res = await fetch("/api/tipos-cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre.trim(), descripcion: nuevoDesc.trim() }),
    });
    if (res.ok) {
      toast({ title: "Tipo creado" });
      setNuevoNombre(""); setNuevoDesc(""); setShowForm(false);
      cargar();
    } else {
      const err = await res.json();
      toast({ title: err.error ?? "Error al crear", variant: "destructive" });
    }
    setCreando(false);
  }

  async function guardarEdicion(id: string) {
    const res = await fetch(`/api/tipos-cliente/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre, descripcion: editDesc }),
    });
    if (res.ok) { toast({ title: "Guardado" }); setEditandoId(null); cargar(); }
    else { const e = await res.json(); toast({ title: e.error ?? "Error", variant: "destructive" }); }
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar tipo "${nombre}"? Los clientes asignados quedarán sin tipo.`)) return;
    const res = await fetch(`/api/tipos-cliente/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Eliminado" }); cargar(); }
    else { const e = await res.json(); toast({ title: e.error ?? "Error", variant: "destructive" }); }
  }

  async function guardarDescuentos(tipoId: string) {
    setGuardando(tipoId);
    const mapa = descuentosEdit[tipoId] ?? {};
    const items = productos.map((p) => ({
      productoId: p.id,
      descuento: parseFloat(mapa[p.id] ?? "0") || 0,
    }));
    const res = await fetch(`/api/tipos-cliente/${tipoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descuentos: items }),
    });
    if (res.ok) {
      toast({ title: "Descuentos guardados" });
      cargar();
    } else {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
    setGuardando(null);
  }

  function setDescuento(tipoId: string, productoId: string, valor: string) {
    setDescuentosEdit((prev) => ({
      ...prev,
      [tipoId]: { ...prev[tipoId], [productoId]: valor },
    }));
  }

  // Agrupar productos por categoría
  const categorias = new Map<string, { nombre: string; orden: number; productos: Producto[] }>();
  for (const p of productos) {
    if (!categorias.has(p.categoria.id)) {
      categorias.set(p.categoria.id, { nombre: p.categoria.nombre, orden: p.categoria.orden, productos: [] });
    }
    categorias.get(p.categoria.id)!.productos.push(p);
  }
  const categoriasOrdenadas = [...categorias.entries()]
    .sort((a, b) => a[1].orden - b[1].orden)
    .map(([id, c]) => ({ id, ...c }));

  if (cargando) return <div className="p-8 text-center text-gray-400">Cargando...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tipos de cliente</h1>
          <p className="text-sm text-gray-500 mt-0.5">Definí categorías de clientes con descuentos distintos por producto.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-pink-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-pink-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo tipo
        </button>
      </div>

      {/* Form nuevo tipo */}
      {showForm && (
        <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-pink-800">Nuevo tipo de cliente</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="Ej: Distribuidor A"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && crear()}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descripción (opcional)</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="Ej: Mayoristas zona norte"
                value={nuevoDesc}
                onChange={(e) => setNuevoDesc(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-xl border border-gray-200">
              Cancelar
            </button>
            <button
              onClick={crear}
              disabled={creando || !nuevoNombre.trim()}
              className="px-4 py-1.5 text-sm bg-pink-600 text-white rounded-xl hover:bg-pink-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Check className="h-3.5 w-3.5" /> Crear
            </button>
          </div>
        </div>
      )}

      {/* Lista de tipos */}
      {tipos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No hay tipos de cliente creados.</p>
          <p className="text-sm mt-1">Creá el primero con el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tipos.map((tipo) => {
            const expandido = expandidoId === tipo.id;
            const editMapa = descuentosEdit[tipo.id] ?? {};

            return (
              <div key={tipo.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                {/* Cabecera */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {editandoId === tipo.id ? (
                    <>
                      <input
                        className="flex-1 border border-pink-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                      />
                      <input
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Descripción"
                      />
                      <button onClick={() => guardarEdicion(tipo.id)} className="text-green-600 hover:text-green-800 p-1"><Check className="h-4 w-4" /></button>
                      <button onClick={() => setEditandoId(null)} className="text-gray-400 hover:text-gray-600 p-1"><X className="h-4 w-4" /></button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{tipo.nombre}</p>
                        {tipo.descripcion && <p className="text-xs text-gray-400">{tipo.descripcion}</p>}
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-2 py-0.5">
                        {tipo._count.clientes} cliente{tipo._count.clientes !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
                        {tipo.descuentos.length} descuento{tipo.descuentos.length !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={() => { setEditandoId(tipo.id); setEditNombre(tipo.nombre); setEditDesc(tipo.descripcion ?? ""); }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      ><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => eliminar(tipo.id, tipo.nombre)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => expandir(tipo)} className="text-gray-400 hover:text-gray-600 p-1 ml-1">
                        {expandido ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </>
                  )}
                </div>

                {/* Matriz de descuentos */}
                {expandido && (
                  <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Descuentos por producto (%)</p>
                      <button
                        onClick={() => guardarDescuentos(tipo.id)}
                        disabled={guardando === tipo.id}
                        className="flex items-center gap-1.5 bg-pink-600 text-white text-xs font-medium px-3 py-1.5 rounded-xl hover:bg-pink-700 disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {guardando === tipo.id ? "Guardando..." : "Guardar descuentos"}
                      </button>
                    </div>

                    {categoriasOrdenadas.map((cat) => (
                      <div key={cat.id}>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{cat.nombre}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {cat.productos.map((prod) => {
                            const pct = editMapa[prod.id] ?? "0";
                            const pctNum = parseFloat(pct) || 0;
                            const precioConDesc = prod.precio * (1 - pctNum / 100);
                            return (
                              <div key={prod.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${pctNum > 0 ? "bg-green-50 border border-green-100" : "bg-gray-50"}`}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-800 truncate">{prod.nombre}</p>
                                  <p className="text-xs text-gray-400">
                                    {formatCurrency(prod.precio)}
                                    {pctNum > 0 && (
                                      <span className="text-green-600 ml-1">→ {formatCurrency(precioConDesc)}</span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={pct}
                                    onChange={(e) => setDescuento(tipo.id, prod.id, e.target.value)}
                                    className="w-14 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                                  />
                                  <span className="text-sm text-gray-400">%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
