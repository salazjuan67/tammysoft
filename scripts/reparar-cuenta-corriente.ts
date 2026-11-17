/**
 * Repara facturas afectadas por el circuito viejo de deuda y cobros.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/reparar-cuenta-corriente.ts                 (solo reporte, no modifica nada)
 *   npx tsx --env-file=.env scripts/reparar-cuenta-corriente.ts --aplicar       (corrige totales y estados)
 *   npx tsx --env-file=.env scripts/reparar-cuenta-corriente.ts --aplicar --borrar-efectivo-auto
 *     (además borra los pagos automáticos "Efectivo sin facturar (solicitud #N)")
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const aplicar = process.argv.includes("--aplicar");
const borrarEfectivoAuto = process.argv.includes("--borrar-efectivo-auto");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 2 }),
});

const TOLERANCIA = 0.005;
const r2 = (n: number) => Math.round(n * 100) / 100;
const $ = (n: number) => `$ ${r2(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

function estadoSegunPagado(montoTotal: number, pagado: number) {
  if (pagado > 0 && pagado >= montoTotal - TOLERANCIA) return "COBRADA" as const;
  if (pagado > 0) return "PARCIALMENTE_COBRADA" as const;
  return "PENDIENTE" as const;
}

async function main() {
  console.log(aplicar ? "MODO APLICAR: se van a guardar cambios\n" : "MODO REPORTE: no se modifica nada (usá --aplicar)\n");

  // Totales que se van a corregir, por factura
  const nuevosTotales = new Map<string, { montoNeto: number; montoIva: number; montoTotal: number; tasaIva: number }>();

  // 1. Facturas de solicitudes procesadas: el total debe ser efectivo + base + IVA
  const items = await db.solicitudItem.findMany({
    where: { solicitud: { estado: "PROCESADA" }, porcentajeFacturado: { gt: 0 } },
    include: {
      solicitud: { select: { numero: true, tasaIva: true } },
      pedido: { select: { factura: { select: { id: true, numero: true, estado: true, montoTotal: true } } } },
    },
  });

  console.log("1) Facturas de solicitudes procesadas con total incorrecto");
  let n1 = 0;
  for (const item of items) {
    const f = item.pedido.factura;
    if (!f || f.estado === "ANULADA") continue;
    const efectivo = Number(item.montoEfectivo);
    const base = Number(item.montoBase);
    const iva = Number(item.montoIva);
    const esperado = r2(efectivo + base + iva);
    if (Math.abs(Number(f.montoTotal) - esperado) <= TOLERANCIA) continue;
    n1++;
    nuevosTotales.set(f.id, { montoNeto: efectivo + base, montoIva: iva, montoTotal: esperado, tasaIva: Number(item.solicitud.tasaIva) });
    console.log(`   Factura #${f.numero} (solicitud #${item.solicitud.numero}): ${$(Number(f.montoTotal))} -> ${$(esperado)}`);
  }
  if (n1 === 0) console.log("   Ninguna");

  // 2. Pagos automáticos de efectivo creados al procesar solicitudes
  const pagosAuto = await db.pago.findMany({
    where: { observaciones: { startsWith: "Efectivo sin facturar (solicitud #" } },
    include: { cliente: { select: { nombre: true } }, factura: { select: { numero: true } } },
    orderBy: { fechaPago: "asc" },
  });

  console.log(`\n2) Pagos automáticos "Efectivo sin facturar": ${pagosAuto.length}`);
  for (const p of pagosAuto) {
    console.log(`   ${p.fechaPago.toISOString().slice(0, 10)}  ${p.cliente.nombre}  factura #${p.factura?.numero ?? "-"}  ${$(Number(p.monto))}  [${p.observaciones}]`);
  }
  if (pagosAuto.length > 0 && !borrarEfectivoAuto) {
    console.log("   Se mantienen. Si ninguno corresponde a plata que realmente entró, volvé a correr con --aplicar --borrar-efectivo-auto");
  }
  const pagosABorrar = new Set(borrarEfectivoAuto ? pagosAuto.map((p) => p.id) : []);

  // 3. Estado de cada factura vigente según su saldo real
  const facturas = await db.factura.findMany({
    where: { estado: { not: "ANULADA" } },
    include: { cliente: { select: { nombre: true } }, pagos: { select: { id: true, monto: true } } },
    orderBy: { numero: "asc" },
  });

  console.log("\n3) Facturas con estado distinto al que corresponde por su saldo");
  const cambiosEstado: { id: string; estado: ReturnType<typeof estadoSegunPagado> }[] = [];
  for (const f of facturas) {
    const total = nuevosTotales.get(f.id)?.montoTotal ?? Number(f.montoTotal);
    const pagado = r2(f.pagos.filter((p) => !pagosABorrar.has(p.id)).reduce((s, p) => s + Number(p.monto), 0));
    const estado = estadoSegunPagado(total, pagado);
    if (estado === f.estado) continue;
    cambiosEstado.push({ id: f.id, estado });
    console.log(`   Factura #${f.numero} ${f.cliente.nombre}: ${f.estado} -> ${estado}  (total ${$(total)}, cobrado ${$(pagado)}, saldo ${$(Math.max(0, total - pagado))})`);
  }
  if (cambiosEstado.length === 0) console.log("   Ninguna");

  if (!aplicar) {
    console.log("\nNo se guardó nada.");
    return;
  }

  await db.$transaction(async (tx) => {
    for (const [id, data] of nuevosTotales) await tx.factura.update({ where: { id }, data });
    if (pagosABorrar.size > 0) await tx.pago.deleteMany({ where: { id: { in: [...pagosABorrar] } } });
    for (const c of cambiosEstado) await tx.factura.update({ where: { id: c.id }, data: { estado: c.estado } });
  }, { timeout: 60_000 });

  console.log(`\nListo: ${nuevosTotales.size} totales corregidos, ${pagosABorrar.size} pagos automáticos borrados, ${cambiosEstado.length} estados actualizados.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
