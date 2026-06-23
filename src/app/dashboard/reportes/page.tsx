"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCcw, TrendingUp, Package, Users, Factory, BarChart2, DollarSign } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface VentasMes { mes: string; label: string; total: number; cantidadPedidos: number }
interface TopProducto { producto: { id: string; nombre: string }; cantidadTotal: number; ventaTotal: number }
interface TopCliente { cliente: { id: string; nombre: string }; totalCompras: number; cantidadPedidos: number }
interface CargaDia { dia: string; items: number; pedidos: number }
interface CargaHorario { rango: string; items: number; pedidos: number }
interface BajaRotacion { producto: { id: string; nombre: string }; cantidadTotal: number }
interface DeudaCliente { clienteId: string; nombre: string; deudaTotal: number; cantidadFacturas: number; diasMax: number; semaforo: "rojo" | "naranja" | "amarillo" | "verde" }
interface FlujoCajaDia { fecha: string; efectivo: number; transferencia: number; total: number }
interface FlujoCajaResumen { totalEfectivo: number; totalTransferencia: number; total: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEMAFORO_COLOR: Record<string, string> = {
  rojo: "bg-red-100 text-red-700 border-red-200",
  naranja: "bg-orange-100 text-orange-700 border-orange-200",
  amarillo: "bg-yellow-100 text-yellow-700 border-yellow-200",
  verde: "bg-green-100 text-green-700 border-green-200",
};

const SEMAFORO_LABEL: Record<string, string> = {
  rojo: "VENCIDA",
  naranja: "En mora",
  amarillo: "Próxima",
  verde: "Bien",
};

const CHART_COLORS = {
  primary: "#ec4899",
  secondary: "#8b5cf6",
  tertiary: "#06b6d4",
  success: "#10b981",
  warning: "#f59e0b",
};

function pct(value: number, max: number) {
  return max > 0 ? Math.round((value / max) * 100) : 0;
}

function exportCSV(data: unknown[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0] as object);
  const rows = [keys.join(","), ...data.map((d) => keys.map((k) => (d as Record<string, unknown>)[k]).join(","))];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Tab content components ──────────────────────────────────────────────────

function TabVentas() {
  const [ventas, setVentas] = useState<VentasMes[]>([]);
  const [productos, setProductos] = useState<TopProducto[]>([]);
  const [clientes, setClientes] = useState<TopCliente[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [v, p, c] = await Promise.all([
      fetch("/api/reportes?tipo=ventas-mes").then((r) => r.json()),
      fetch("/api/reportes?tipo=productos-mas-vendidos").then((r) => r.json()),
      fetch("/api/reportes?tipo=clientes-principales").then((r) => r.json()),
    ]);
    setVentas(v.data ?? []);
    setProductos(p.data ?? []);
    setClientes(c.data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const maxProducto = Math.max(...productos.map((p) => p.cantidadTotal), 1);
  const maxCliente = Math.max(...clientes.map((c) => c.totalCompras), 1);

  if (cargando) return <p className="text-gray-500 text-sm py-12 text-center">Cargando datos...</p>;

  return (
    <div className="space-y-6">
      {/* Ventas 12 meses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-pink-600" /> Ventas últimos 12 meses (pedidos entregados)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => exportCSV(ventas, "ventas-mes")}>
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          {ventas.every((v) => v.total === 0) ? (
            <p className="text-gray-400 text-sm text-center py-8">Sin datos de ventas aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={ventas}>
                <defs>
                  <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Vendido"]} labelStyle={{ fontWeight: 600 }} />
                <Area type="monotone" dataKey="total" stroke={CHART_COLORS.primary} strokeWidth={2} fill="url(#gradVentas)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top productos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-violet-600" /> Top 10 productos
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => exportCSV(productos.map((p) => ({ producto: p.producto.nombre, unidades: p.cantidadTotal, ingresos: p.ventaTotal })), "top-productos")}>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
          </CardHeader>
          <CardContent>
            {productos.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {productos.map((p, i) => (
                  <div key={p.producto.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-xs text-gray-400 w-5 text-right flex-shrink-0">#{i + 1}</span>
                        <span className="truncate font-medium text-gray-800">{p.producto.nombre}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-gray-500 text-xs">{p.cantidadTotal} u.</span>
                        <span className="font-semibold text-gray-900 text-xs">{formatCurrency(p.ventaTotal)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${pct(p.cantidadTotal, maxProducto)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top clientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-cyan-600" /> Top 10 clientes
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => exportCSV(clientes.map((c) => ({ cliente: c.cliente.nombre, totalCompras: c.totalCompras, pedidos: c.cantidadPedidos })), "top-clientes")}>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
          </CardHeader>
          <CardContent>
            {clientes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {clientes.map((c, i) => (
                  <div key={c.cliente.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-xs text-gray-400 w-5 text-right flex-shrink-0">#{i + 1}</span>
                        <span className="truncate font-medium text-gray-800">{c.cliente.nombre}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-gray-500 text-xs">{c.cantidadPedidos} ped.</span>
                        <span className="font-semibold text-gray-900 text-xs">{formatCurrency(c.totalCompras)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${pct(c.totalCompras, maxCliente)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TabProduccion() {
  const [cargaDia, setCargaDia] = useState<CargaDia[]>([]);
  const [cargaHorario, setCargaHorario] = useState<CargaHorario[]>([]);
  const [bajaRotacion, setBajaRotacion] = useState<BajaRotacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [d, h, b] = await Promise.all([
      fetch("/api/reportes?tipo=carga-dia-semana").then((r) => r.json()),
      fetch("/api/reportes?tipo=carga-horario-hoy").then((r) => r.json()),
      fetch("/api/reportes?tipo=productos-baja-rotacion").then((r) => r.json()),
    ]);
    setCargaDia(d.data ?? []);
    setCargaHorario(h.data ?? []);
    setBajaRotacion(b.data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <p className="text-gray-500 text-sm py-12 text-center">Cargando datos...</p>;

  return (
    <div className="space-y-6">
      {/* Carga por día */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Factory className="h-4 w-4 text-pink-600" /> Carga por día de la semana (últimos 90 días)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cargaDia.every((d) => d.items === 0) ? (
            <p className="text-gray-400 text-sm text-center py-8">Sin datos de producción</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cargaDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
                        <p className="font-semibold mb-1">{label}</p>
                        <p className="text-pink-600">{payload[0]?.value} items</p>
                        <p className="text-gray-500">{(payload[0]?.payload as CargaDia).pedidos} pedidos</p>
                      </div>
                    );
                  }} />
                  <Bar dataKey="items" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...cargaDia].sort((a, b) => b.items - a.items).slice(0, 3).map((d, i) => (
                  <span key={d.dia} className={`text-xs px-2 py-1 rounded-full font-medium ${i === 0 ? "bg-red-100 text-red-700" : i === 1 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {i === 0 ? "🔴" : i === 1 ? "🟠" : "🟡"} {d.dia}: {d.items} items
                  </span>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Carga horario hoy + Baja rotación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-4 w-4 text-violet-600" /> Carga horaria HOY
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cargaHorario.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No hay pedidos para hoy</p>
            ) : (
              <div className="space-y-3">
                {cargaHorario.map((h) => {
                  const maxItems = Math.max(...cargaHorario.map((x) => x.items), 1);
                  return (
                    <div key={h.rango}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{h.rango.replace("H", "").replace("_", "–")} hs</span>
                        <span className="text-gray-500 text-xs">{h.items} items · {h.pedidos} ped.</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct(h.items, maxItems)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-gray-400" /> Baja rotación (90 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bajaRotacion.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {bajaRotacion.map((b) => (
                  <div key={b.producto.id} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700 truncate flex-1">{b.producto.nombre}</span>
                    <span className="text-xs text-orange-600 font-medium ml-2 flex-shrink-0">
                      {b.cantidadTotal} u. vendidas
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TabCobranza() {
  const [deuda, setDeuda] = useState<DeudaCliente[]>([]);
  const [flujo, setFlujo] = useState<FlujoCajaDia[]>([]);
  const [resumen, setResumen] = useState<FlujoCajaResumen | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [d, f] = await Promise.all([
      fetch("/api/reportes?tipo=deuda-envejecida").then((r) => r.json()),
      fetch("/api/reportes?tipo=flujo-caja").then((r) => r.json()),
    ]);
    setDeuda(d.data ?? []);
    setFlujo(f.data ?? []);
    setResumen(f.resumen ?? null);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <p className="text-gray-500 text-sm py-12 text-center">Cargando datos...</p>;

  const totalDeuda = deuda.reduce((s, c) => s + c.deudaTotal, 0);
  const totalEfectivo = resumen?.totalEfectivo ?? 0;
  const totalTransferencia = resumen?.totalTransferencia ?? 0;
  const totalCobrado = resumen?.total ?? 0;
  const pctEfectivo = totalCobrado > 0 ? Math.round((totalEfectivo / totalCobrado) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Resumen caja */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-5">
            <p className="text-xs text-green-600 font-medium mb-1">💵 Caja (Efectivo)</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalEfectivo)}</p>
            <p className="text-xs text-green-600 mt-1">{pctEfectivo}% del total cobrado</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-5">
            <p className="text-xs text-blue-600 font-medium mb-1">🏦 Banco (Transferencia)</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalTransferencia)}</p>
            <p className="text-xs text-blue-600 mt-1">{100 - pctEfectivo}% del total cobrado</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500 font-medium mb-1">📊 Total cobrado</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCobrado)}</p>
            <p className="text-xs text-gray-400 mt-1">Últimos 30 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Flujo de caja */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-green-600" /> Flujo de caja (últimos 30 días)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => exportCSV(flujo, "flujo-caja")}>
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          {flujo.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Sin pagos registrados en los últimos 30 días</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={flujo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v, name) => [formatCurrency(Number(v)), name === "efectivo" ? "Efectivo" : name === "transferencia" ? "Transferencia" : "Total"]}
                />
                <Legend formatter={(value) => (({ efectivo: "Efectivo", transferencia: "Transferencia", total: "Total" } as Record<string, string>)[value] ?? value)} />
                <Line type="monotone" dataKey="efectivo" stroke={CHART_COLORS.success} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="transferencia" stroke={CHART_COLORS.tertiary} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="total" stroke={CHART_COLORS.primary} strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Deuda envejecida */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-orange-500" /> Deuda por cliente
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Total: {formatCurrency(totalDeuda)}</span>
            <Button variant="outline" size="sm" onClick={() => exportCSV(deuda, "deuda-clientes")}>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {deuda.length === 0 ? (
            <p className="text-green-600 text-sm text-center py-8 font-medium">✅ Sin deudas pendientes</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                    <th className="text-left pb-2 pr-4">Cliente</th>
                    <th className="text-right pb-2 pr-4">Deuda</th>
                    <th className="text-right pb-2 pr-4">Facturas</th>
                    <th className="text-right pb-2 pr-4">Días sin pagar</th>
                    <th className="text-center pb-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {deuda.map((c) => (
                    <tr key={c.clienteId} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-800">{c.nombre}</td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-gray-900">{formatCurrency(c.deudaTotal)}</td>
                      <td className="py-2.5 pr-4 text-right text-gray-500">{c.cantidadFacturas}</td>
                      <td className="py-2.5 pr-4 text-right text-gray-700 font-medium">{c.diasMax}d</td>
                      <td className="py-2.5 text-center">
                        <Badge className={`text-xs ${SEMAFORO_COLOR[c.semaforo]} border`} variant="outline">
                          {SEMAFORO_LABEL[c.semaforo]}
                        </Badge>
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

// ─── Tab Gastos ───────────────────────────────────────────────────────────────

interface FlujoCajaCompleto { fecha: string; ingresos: number; egresos: number; neto: number }
interface GastoConcepto { concepto: string; total: number; cantidad: number }
interface DeudaProveedor { proveedorId: string; nombre: string; pendiente: number; vencidas: number; cantidadFacturas: number }

function TabGastos() {
  const [flujo, setFlujo] = useState<FlujoCajaCompleto[]>([]);
  const [resumen, setResumen] = useState<{ totalIngresos: number; totalEgresos: number; neto: number } | null>(null);
  const [conceptos, setConceptos] = useState<GastoConcepto[]>([]);
  const [deudaProv, setDeudaProv] = useState<DeudaProveedor[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [f, g, d] = await Promise.all([
      fetch("/api/reportes?tipo=flujo-caja-completo").then(r => r.json()),
      fetch("/api/reportes?tipo=gastos-por-concepto").then(r => r.json()),
      fetch("/api/reportes?tipo=deuda-proveedores").then(r => r.json()),
    ]);
    setFlujo(f.data ?? []);
    setResumen(f.resumen ?? null);
    setConceptos(g.data ?? []);
    setDeudaProv(d.data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const maxConcepto = Math.max(...conceptos.map(c => c.total), 1);

  if (cargando) return <div className="py-20 text-center text-gray-400">Cargando reportes de gastos...</div>;

  return (
    <div className="space-y-6">
      {/* Resumen hoy */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-green-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Ingresos (30d)</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(resumen.totalIngresos)}</p></CardContent>
          </Card>
          <Card className="border-red-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Egresos (30d)</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(resumen.totalEgresos)}</p></CardContent>
          </Card>
          <Card className={resumen.neto >= 0 ? "border-blue-100" : "border-red-100"}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Neto (30d)</CardTitle></CardHeader>
            <CardContent><p className={`text-2xl font-bold ${resumen.neto >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(resumen.neto)}</p></CardContent>
          </Card>
        </div>
      )}

      {/* Flujo de caja */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Flujo de caja — últimos 30 días</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => exportCSV(flujo, "flujo-caja")}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
        </CardHeader>
        <CardContent>
          {flujo.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Sin movimientos en los últimos 30 días</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={flujo} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} labelFormatter={(l) => `Fecha: ${l}`} />
                <Legend />
                <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="neto" name="Neto" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por concepto */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Gastos por concepto (30d)</CardTitle></CardHeader>
          <CardContent>
            {conceptos.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin facturas de proveedores en 30 días</p>
            ) : (
              <div className="space-y-3">
                {conceptos.map((c) => (
                  <div key={c.concepto}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="font-medium text-gray-800">{c.concepto}</span>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">{formatCurrency(c.total)}</span>
                        <span className="text-gray-400 text-xs ml-2">({c.cantidad} fact.)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-red-400 h-2 rounded-full transition-all" style={{ width: `${pct(c.total, maxConcepto)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deuda a proveedores */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Deuda a proveedores</CardTitle></CardHeader>
          <CardContent className="p-0">
            {deudaProv.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin deuda a proveedores</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Proveedor</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Pendiente</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Vencido</th>
                </tr></thead>
                <tbody>
                  {deudaProv.map(p => (
                    <tr key={p.proveedorId} className="border-b border-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{p.nombre}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-orange-600">{formatCurrency(p.pendiente)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${p.vencidas > 0 ? "text-red-600" : "text-gray-400"}`}>
                        {p.vencidas > 0 ? formatCurrency(p.vencidas) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "ventas", label: "💰 Ventas", icon: TrendingUp },
  { id: "produccion", label: "🏭 Producción", icon: Factory },
  { id: "cobranza", label: "💵 Cobranza", icon: DollarSign },
  { id: "gastos", label: "📦 Gastos", icon: BarChart2 },
] as const;

type TabId = typeof TABS[number]["id"];

export default function ReportesPage() {
  const [tab, setTab] = useState<TabId>("ventas");
  const [key, setKey] = useState(0);

  function recargar() { setKey((k) => k + 1); }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 text-sm mt-1">Análisis y métricas del negocio</p>
        </div>
        <Button variant="outline" size="sm" onClick={recargar}>
          <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Actualizar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div key={`${tab}-${key}`}>
        {tab === "ventas" && <TabVentas />}
        {tab === "produccion" && <TabProduccion />}
        {tab === "cobranza" && <TabCobranza />}
        {tab === "gastos" && <TabGastos />}
      </div>
    </div>
  );
}
