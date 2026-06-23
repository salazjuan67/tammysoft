import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializePrisma } from "@/lib/utils";
import { PedidosClient } from "./pedidos-client";

export default async function PedidosPage() {
  const session = await auth();
  const userRol = (session?.user as { rol: string })?.rol ?? "CLIENTE";
  const userClienteId = (session?.user as { clienteId?: string })?.clienteId;

  // Pre-cargar clientes y categorías para los formularios
  const [clientes, categorias] = await Promise.all([
    userRol === "CLIENTE"
      ? db.cliente.findMany({ where: { id: userClienteId ?? "none" } })
      : db.cliente.findMany({ where: { estado: true }, orderBy: { nombre: "asc" } }),
    db.categoria.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
      include: {
        productos: {
          where: { activo: true },
          orderBy: { nombre: "asc" },
        },
      },
    }),
  ]);

  return (
    <PedidosClient
      clientes={serializePrisma(clientes)}
      categorias={serializePrisma(categorias)}
      userRol={userRol}
      userId={session?.user?.id ?? ""}
    />
  );
}
