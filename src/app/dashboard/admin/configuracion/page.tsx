"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
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
import { FlaskConical, Trash2, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ConfiguracionPage() {
  const [seedLoading, setSeedLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [lastAction, setLastAction] = useState<{ type: "seed" | "reset"; ok: boolean; msg: string } | null>(null);

  async function handleSeed() {
    setSeedLoading(true);
    setLastAction(null);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        setLastAction({ type: "seed", ok: false, msg: data.error });
      } else {
        toast({ title: "Datos creados", description: `${data.clientes} clientes y ${data.pedidos} pedidos de ejemplo cargados.` });
        setLastAction({ type: "seed", ok: true, msg: data.message });
      }
    } catch {
      toast({ title: "Error de red", variant: "destructive" });
    } finally {
      setSeedLoading(false);
    }
  }

  async function handleReset() {
    setResetLoading(true);
    setLastAction(null);
    try {
      const res = await fetch("/api/demo/reset", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        setLastAction({ type: "reset", ok: false, msg: data.error });
      } else {
        toast({ title: "Datos eliminados", description: "Todos los datos de ejemplo fueron eliminados." });
        setLastAction({ type: "reset", ok: true, msg: data.message });
      }
    } catch {
      toast({ title: "Error de red", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Herramientas de administración del sistema</p>
      </div>

      {/* Demo data section */}
      <Card className="border-amber-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Datos de ejemplo</CardTitle>
            <Badge variant="warning" className="text-xs">Solo ADMIN</Badge>
          </div>
          <CardDescription>
            Crea o elimina clientes y pedidos de ejemplo para probar el sistema. Los productos, categorías y usuarios reales{" "}
            <strong>no se modifican</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Create demo data */}
            <div className="border border-green-200 rounded-lg p-4 bg-green-50 space-y-3">
              <div>
                <p className="font-medium text-sm text-green-800">Cargar datos de ejemplo</p>
                <p className="text-xs text-green-700 mt-1">
                  Crea 4 clientes demo y 8 pedidos con diferentes estados (Pendiente, En producción, Entregado, Cancelado).
                </p>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="sm"
                onClick={handleSeed}
                disabled={seedLoading || resetLoading}
              >
                {seedLoading ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Creando...</>
                ) : (
                  <><FlaskConical className="h-4 w-4 mr-2" /> Crear datos de ejemplo</>
                )}
              </Button>
            </div>

            {/* Delete demo data */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50 space-y-3">
              <div>
                <p className="font-medium text-sm text-red-800">Eliminar datos de ejemplo</p>
                <p className="text-xs text-red-700 mt-1">
                  Elimina todos los clientes y pedidos de ejemplo. Los datos reales cargados manualmente permanecen.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                    disabled={seedLoading || resetLoading}
                  >
                    {resetLoading ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Eliminando...</>
                    ) : (
                      <><Trash2 className="h-4 w-4 mr-2" /> Eliminar datos de ejemplo</>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar datos de ejemplo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán los 4 clientes demo y sus 8 pedidos asociados. Esta acción no se puede deshacer.
                      Los productos, categorías y usuarios reales no se tocan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleReset}
                    >
                      Sí, eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Last action result */}
          {lastAction && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${lastAction.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              {lastAction.ok
                ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span>{lastAction.msg}</span>
            </div>
          )}

          <div className="text-xs text-gray-500 border-t pt-3 space-y-1">
            <p><strong>Datos que se crean:</strong> 4 clientes · 8 pedidos · ítems de productos reales</p>
            <p><strong>Datos que NO se tocan:</strong> productos · categorías · usuarios · proveedores</p>
            <p className="text-amber-600"><strong>Tip:</strong> Podés crear y eliminar las veces que quieras para hacer demos o pruebas.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
