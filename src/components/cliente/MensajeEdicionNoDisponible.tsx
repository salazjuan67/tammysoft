import { Lock } from "lucide-react";

interface Props {
  motivo: string | null;
  limite: string | null; // ISO string
  estado?: string;
}

export default function MensajeEdicionNoDisponible({ motivo, limite, estado }: Props) {
  const fechaLimite = limite
    ? new Date(limite).toLocaleString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Lock className="h-4 w-4 text-gray-500" />
      </div>
      <div>
        <p className="font-semibold text-gray-700 text-sm">Este pedido no puede editarse</p>
        {estado && estado !== "PENDIENTE" ? (
          <p className="text-gray-500 text-sm mt-0.5">El estado del pedido es <strong>{estado}</strong>.</p>
        ) : (
          <>
            {motivo && <p className="text-gray-500 text-sm mt-0.5">{motivo}</p>}
            {fechaLimite && (
              <p className="text-gray-400 text-xs mt-1">Límite de edición era: {fechaLimite}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
