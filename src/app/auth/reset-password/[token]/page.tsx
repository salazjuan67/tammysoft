"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [validando, setValidando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    async function validarToken() {
      const res = await fetch(`/api/auth/reset-password?token=${token}`);
      const json = await res.json();
      setTokenValido(json.valido === true);
      setValidando(false);
    }
    validarToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (res.ok) {
        setExito(true);
        setTimeout(() => router.push("/auth/login"), 3000);
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="text-3xl mb-2">🍰</div>
          <CardTitle className="text-xl text-pink-700">Postres Tammy Light</CardTitle>
          <p className="text-gray-500 text-sm">Crear nueva contraseña</p>
        </CardHeader>
        <CardContent className="pt-4">
          {validando && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Verificando link...</span>
            </div>
          )}

          {!validando && !tokenValido && (
            <div className="text-center py-8 space-y-3">
              <XCircle className="h-12 w-12 text-red-400 mx-auto" />
              <p className="font-medium text-gray-800">Link inválido o expirado</p>
              <p className="text-sm text-gray-500">
                El link ya fue utilizado o expiró (tiene validez de 2 horas).
                Pedile al administrador que te envíe uno nuevo.
              </p>
              <Button variant="outline" onClick={() => router.push("/auth/login")}>
                Volver al login
              </Button>
            </div>
          )}

          {!validando && tokenValido && !exito && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Repetir contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repetí la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={guardando}>
                {guardando ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando...</>
                ) : (
                  "Guardar nueva contraseña"
                )}
              </Button>
            </form>
          )}

          {exito && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-medium text-gray-800">¡Contraseña actualizada!</p>
              <p className="text-sm text-gray-500">Redirigiendo al login en unos segundos...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
