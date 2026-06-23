"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Factura {
  id: string;
  numero: number;
  fecha: string;
  montoTotal: string | number;
  estado: "PENDIENTE" | "PARCIALMENTE_COBRADA" | "COBRADA" | "ANULADA";
  cliente: { id: string; nombre: string };
}

interface Cliente {
  id: string;
  nombre: string;
}

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: "Sin cobrar",
  PARCIALMENTE_COBRADA: "Parcial",
  COBRADA: "Cobrada",
  ANULADA: "Anulada",
};

const ESTADO_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  PENDIENTE: "destructive",
  PARCIALMENTE_COBRADA: "warning",
  COBRADA: "success",
  ANULADA: "secondary",
};

export default function FacturacionPage() {
  const router = useRouter();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filters
  const [estadoFiltro, setEstadoFiltro] = useState("cobrada");
  const [clienteId, setClienteId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");

  const fetchFacturas = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      estado: estadoFiltro,
    });
    if (clienteId) params.set("clienteId", clienteId);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);

    const res = await fetch(`/api/facturas?${params}`);
    const json = await res.json();
    setFacturas(json.data ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [page, estadoFiltro, clienteId, desde, hasta]);

  useEffect(() => { fetchFacturas(); }, [fetchFacturas]);

  useEffect(() => {
    fetch("/api/clientes?pageSize=200")
      .then((r) => r.json())
      .then((j) => setClientes(j.data ?? []));
  }, []);

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())
  );

  const totalPages = Math.ceil(total / pageSize);

  function limpiarFiltros() {
    setEstadoFiltro("cobrada");
    setClienteId("");
    setDesde("");
    setHasta("");
    setBusquedaCliente("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
          <p className="text-gray-500 text-sm mt-1">{total} factura{total !== 1 ? "s" : ""} en total</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Estado</label>
              <Select value={estadoFiltro} onValueChange={(v) => { setEstadoFiltro(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cobrada">Cobradas</SelectItem>
                  <SelectItem value="sin-cobrar">Sin cobrar</SelectItem>
                  <SelectItem value="todas">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente</label>
              <Select value={clienteId} onValueChange={(v) => { setClienteId(v === "todos" ? "" : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 pb-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                      <Input
                        placeholder="Buscar cliente..."
                        className="pl-7 h-8 text-sm"
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                      />
                    </div>
                  </div>
                  <SelectItem value="todos">Todos los clientes</SelectItem>
                  {clientesFiltrados.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Desde</label>
              <Input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }} />
            </div>
          </div>

          {(estadoFiltro !== "cobrada" || clienteId || desde || hasta) && (
            <button
              onClick={limpiarFiltros}
              className="mt-2 text-xs text-pink-600 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-pink-600" />
            Facturas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
          ) : facturas.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No hay facturas con los filtros seleccionados</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nº Factura</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/facturacion/${f.id}`)}
                    >
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">
                        FAC-{String(f.numero).padStart(5, "0")}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(f.fecha)}</td>
                      <td className="px-4 py-3 text-gray-900">{f.cliente.nombre}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(Number(f.montoTotal))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={ESTADO_VARIANT[f.estado] ?? "secondary"}>
                          {ESTADO_LABELS[f.estado] ?? f.estado}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/facturacion/${f.id}`)}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Página {page} de {totalPages} ({total} facturas)
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
