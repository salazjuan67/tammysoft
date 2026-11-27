/**
 * Crea / actualiza usuarios de Producción y Pedidos (Luisa y Delia).
 * Uso: npx tsx --env-file=.env.local scripts/crear-usuarios-produccion.ts
 * Imprime las contraseñas temporales una sola vez.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 2 }),
});

function tempPassword(prefix: string) {
  return `${prefix}-${randomBytes(4).toString("hex")}`;
}

const USUARIOS = [
  {
    nombre: "Luisa Veron",
    email: "luisaveron1980@gmail.com",
    telefono: "1132270548",
    password: tempPassword("Luisa"),
  },
  {
    nombre: "Delia Rodriguez",
    email: "demaro@outlook.com.ar",
    telefono: "1121721130",
    password: tempPassword("Delia"),
  },
] as const;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL (usá --env-file=.env.local)");
  }

  console.log("\n=== Usuarios PRODUCCION (Pedidos + Producción) ===\n");
  for (const u of USUARIOS) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    const usuario = await db.usuario.upsert({
      where: { email: u.email },
      create: {
        nombre: u.nombre,
        email: u.email,
        telefono: u.telefono,
        passwordHash,
        rol: "PRODUCCION",
        activo: true,
      },
      update: {
        nombre: u.nombre,
        telefono: u.telefono,
        passwordHash,
        rol: "PRODUCCION",
        activo: true,
      },
      select: { id: true, email: true, nombre: true, rol: true, telefono: true },
    });
    console.log(`${usuario.nombre}`);
    console.log(`  email: ${usuario.email}`);
    console.log(`  tel:   ${usuario.telefono}`);
    console.log(`  rol:   ${usuario.rol}`);
    console.log(`  pass:  ${u.password}`);
    console.log("");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
