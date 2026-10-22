import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { notifyPedidosChanged } from "@/lib/monitor/changes";

const WRITES = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

async function watchWrites({ operation, args, query }: { operation: string; args: unknown; query: (args: unknown) => Promise<unknown> }) {
  const result = await query(args);
  if (WRITES.has(operation)) notifyPedidosChanged();
  return result;
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    // El pooler de Supabase en modo sesión admite 15 clientes en total (servidor + workers del build).
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  }).$extends({
    // Cualquier escritura de pedidos avisa al monitor en vivo, sin consultas extra a la base.
    query: {
      pedido: { $allOperations: watchWrites },
      pedidoItem: { $allOperations: watchWrites },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
