import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── Configuración del sistema ─────────────────────────────────────────────
  await prisma.configuracionSistema.upsert({
    where: { clave: "tasa_iva" },
    update: {},
    create: { clave: "tasa_iva", valor: "0.21" },
  });

  await prisma.configuracionSistema.upsert({
    where: { clave: "hora_limite_edicion" },
    update: {},
    create: { clave: "hora_limite_edicion", valor: "12:00" },
  });

  await prisma.configuracionSistema.upsert({
    where: { clave: "horas_gracia_edicion" },
    update: {},
    create: { clave: "horas_gracia_edicion", valor: "2" },
  });

  // ─── Usuario Admin ─────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.usuario.upsert({
    where: { email: "admin@postrestammy.com" },
    update: {},
    create: {
      email: "admin@postrestammy.com",
      passwordHash,
      nombre: "Administrador",
      rol: "ADMIN",
      activo: true,
    },
  });
  console.log(`✅ Admin creado: ${admin.email}`);

  // ─── Categorías ────────────────────────────────────────────────────────────
  const categorias = [
    { nombre: "Mousses", descripcion: "Mousses de distintos sabores", orden: 1 },
    { nombre: "Mini Tortas", descripcion: "Tortas individuales", orden: 2 },
    { nombre: "Tartas", descripcion: "Tartas dulces", orden: 3 },
    { nombre: "Brownies y Cookies", descripcion: "Brownies, cookies y similares", orden: 4 },
    { nombre: "Cheesecakes", descripcion: "Cheesecakes varios", orden: 5 },
    { nombre: "Budines", descripcion: "Budines y bizcochos", orden: 6 },
    { nombre: "Gelatinas", descripcion: "Gelatinas dietéticas", orden: 7 },
    { nombre: "Otros", descripcion: "Otros postres", orden: 8 },
  ];

  for (const cat of categorias) {
    await prisma.categoria.upsert({
      where: { nombre: cat.nombre },
      update: {},
      create: cat,
    });
  }
  console.log(`✅ ${categorias.length} categorías creadas`);

  // ─── Productos de ejemplo ──────────────────────────────────────────────────
  const catMousess = await prisma.categoria.findUnique({ where: { nombre: "Mousses" } });
  const catMiniTortas = await prisma.categoria.findUnique({ where: { nombre: "Mini Tortas" } });
  const catCheesecakes = await prisma.categoria.findUnique({ where: { nombre: "Cheesecakes" } });

  if (catMousess && catMiniTortas && catCheesecakes) {
    const productos = [
      { nombre: "Mousse de Chocolate", categoriaId: catMousess.id, precio: 1500 },
      { nombre: "Mousse de Vainilla", categoriaId: catMousess.id, precio: 1500 },
      { nombre: "Mousse de Frutilla", categoriaId: catMousess.id, precio: 1500 },
      { nombre: "Mousse de Dulce de Leche", categoriaId: catMousess.id, precio: 1600 },
      { nombre: "Mini Torta Chocolate", categoriaId: catMiniTortas.id, precio: 2200 },
      { nombre: "Mini Torta Limón", categoriaId: catMiniTortas.id, precio: 2200 },
      { nombre: "Cheesecake Clásico", categoriaId: catCheesecakes.id, precio: 2500 },
      { nombre: "Cheesecake Frambuesa", categoriaId: catCheesecakes.id, precio: 2700 },
    ];

    for (const prod of productos) {
      const existing = await prisma.producto.findFirst({
        where: { nombre: prod.nombre, categoriaId: prod.categoriaId },
      });
      if (!existing) {
        await prisma.producto.create({ data: prod });
      }
    }
    console.log(`✅ ${productos.length} productos de ejemplo creados`);
  }

  console.log("🎉 Seed completado exitosamente");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
