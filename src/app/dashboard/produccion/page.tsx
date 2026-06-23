import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializePrisma } from "@/lib/utils";
import { ProduccionClient } from "./produccion-client";

async function getComandaDelDia(fecha: Date) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);

  const pedidos = await db.pedido.findMany({
    where: {
      fechaEntrega: { gte: inicio, lte: fin },
      estado: { in: ["PENDIENTE", "EN_PRODUCCION"] },
    },
    include: {
      cliente: { select: { id: true, nombre: true } },
      items: {
        include: {
          producto: { include: { categoria: true } },
        },
        orderBy: { producto: { nombre: "asc" } },
      },
    },
    orderBy: [{ rangoHorario: "asc" }, { cliente: { nombre: "asc" } }],
  });

  const alertasNoLeidas = await db.alerta.count({ where: { leido: false } });

  return { pedidos, alertasNoLeidas };
}

export default async function ProduccionPage() {
  const session = await auth();
  const userRol = (session?.user as { rol: string })?.rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return <div className="py-12 text-center text-gray-500">Sin permisos para acceder a producción</div>;
  }

  const hoy = new Date();
  const { pedidos, alertasNoLeidas } = await getComandaDelDia(hoy);

  return <ProduccionClient pedidosIniciales={serializePrisma(pedidos)} alertasNoLeidas={alertasNoLeidas} fechaInicial={hoy.toISOString()} />;
}
