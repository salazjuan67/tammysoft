"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { Banknote, Building2, Wallet, RefreshCw } from "lucide-react";

interface DineroDia { fecha: string; caja: number; banco: number; egresos: number }
interface DineroData {
  enCaja: number;
  enBanco: number;
  total: number;
  porcentajeCaja: number;
  porcentajeBanco: number;
  movimientosDia: { ingresoCaja: number; ingresoBanco: number; egresos: number };
  historico7Dias: DineroDia[];
}

interface Props {
  compact?: boolean;
  autoRefresh?: boolean;
}

export default function ResumenDineroDisponible({ compact = false, autoRefresh = false }: Props) {
  const [data, setData] = useState<DineroData | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/cobranza/dinero-disponible");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
    if (autoRefresh) {
      const id = setInterval(cargar, 60_000);
      return () => clearInterval(id);
    }
  }, [cargar, autoRefresh]);

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Cargando...</div>;
  if (!data) return null;

  const pieData = [
    { name: "Caja", value: data.enCaja, color: "#10b981" },
    { name: "Banco", value: data.enBanco, color: "#3b82f6" },
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-green-100">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-gray-600">En Caja (Efectivo)</CardTitle>
            <Banknote className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data.enCaja)}</p>
            <p className="text-xs text-gray-400 mt-1">{data.porcentajeCaja}% del total</p>
            {data.movimientosDia.ingresoCaja > 0 && (
              <p className="text-xs text-green-600 mt-1">+{formatCurrency(data.movimientosDia.ingresoCaja)} hoy</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-blue-100">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-gray-600">En Banco (Transf.)</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.enBanco)}</p>
            <p className="text-xs text-gray-400 mt-1">{data.porcentajeBanco}% del total</p>
            {data.movimientosDia.ingresoBanco > 0 && (
              <p className="text-xs text-blue-600 mt-1">+{formatCurrency(data.movimientosDia.ingresoBanco)} hoy</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-gray-600">Total disponible</CardTitle>
            <Wallet className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.total)}</p>
            {data.movimientosDia.egresos > 0 && (
              <p className="text-xs text-red-500 mt-1">−{formatCurrency(data.movimientosDia.egresos)} egresos hoy</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-green-800">💵 En Caja (Efectivo)</CardTitle>
            <Banknote className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-700">{formatCurrency(data.enCaja)}</p>
            <p className="text-xs text-green-600 mt-1">{data.porcentajeCaja}% del total</p>
            <div className="mt-2 text-xs text-green-700 space-y-0.5">
              {data.movimientosDia.ingresoCaja > 0 && <p>+{formatCurrency(data.movimientosDia.ingresoCaja)} ingresado hoy</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-blue-800">🏦 En Banco (Transf.)</CardTitle>
            <Building2 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-700">{formatCurrency(data.enBanco)}</p>
            <p className="text-xs text-blue-600 mt-1">{data.porcentajeBanco}% del total</p>
            <div className="mt-2 text-xs text-blue-700 space-y-0.5">
              {data.movimientosDia.ingresoBanco > 0 && <p>+{formatCurrency(data.movimientosDia.ingresoBanco)} ingresado hoy</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-800">💰 Total Disponible</CardTitle>
            <Wallet className="h-5 w-5 text-gray-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(data.total)}</p>
            <div className="mt-2 text-xs text-gray-500 space-y-0.5">
              {data.movimientosDia.egresos > 0 && <p className="text-red-500">−{formatCurrency(data.movimientosDia.egresos)} egresos hoy</p>}
              <p>
                Neto hoy: <span className="font-semibold text-gray-700">
                  {formatCurrency((data.movimientosDia.ingresoCaja + data.movimientosDia.ingresoBanco) - data.movimientosDia.egresos)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dona caja vs banco */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Distribución Caja / Banco</CardTitle>
            <button onClick={cargar} className="text-gray-400 hover:text-gray-600"><RefreshCw className="h-3.5 w-3.5" /></button>
          </CardHeader>
          <CardContent>
            {data.total === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">Sin cobros registrados aún</p>
            ) : (
              <div className="flex items-center gap-6">
                <PieChart width={160} height={160}>
                  <Pie data={pieData} cx={75} cy={75} innerRadius={45} outerRadius={72} dataKey="value" strokeWidth={2}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
                <div className="space-y-4 flex-1">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <div>
                        <p className="text-xs text-gray-500">{d.name}</p>
                        <p className="font-bold text-gray-900 text-sm">{formatCurrency(d.value)}</p>
                        <p className="text-xs text-gray-400">{data.total > 0 ? Math.round((d.value / data.total) * 100) : 0}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico 7 días */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Evolución últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.historico7Dias} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="caja" name="Caja" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="banco" name="Banco" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
