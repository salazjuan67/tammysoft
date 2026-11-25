import type { db } from "@/lib/db";

type Tx = {
  materiaPrima: typeof db.materiaPrima;
  movimientoStock: typeof db.movimientoStock;
};

function normalizarNombre(nombre: string) {
  return nombre.trim().replace(/\s+/g, " ");
}

function normalizarUnidad(unidad: string) {
  const u = (unidad || "UN").trim().toUpperCase();
  const map: Record<string, string> = {
    KILO: "KG",
    KILOS: "KG",
    KGS: "KG",
    LITRO: "L",
    LITROS: "L",
    LT: "L",
    LTS: "L",
    UNIDAD: "UN",
    UNIDADES: "UN",
    U: "UN",
    GRAMO: "GR",
    GRAMOS: "GR",
    G: "GR",
    MILILITRO: "ML",
    MILILITROS: "ML",
  };
  return map[u] ?? u;
}

/** Busca o crea una materia prima por nombre+unidad (case-insensitive en nombre). */
export async function resolverMateriaPrima(
  tx: Tx,
  descripcion: string,
  unidadRaw: string
) {
  const nombre = normalizarNombre(descripcion);
  const unidad = normalizarUnidad(unidadRaw);

  const existente = await tx.materiaPrima.findFirst({
    where: {
      activo: true,
      unidad,
      nombre: { equals: nombre, mode: "insensitive" },
    },
  });
  if (existente) return existente;

  try {
    return await tx.materiaPrima.create({
      data: { nombre, unidad, stockActual: 0 },
    });
  } catch {
    // Carrera en unique(nombre, unidad)
    const retry = await tx.materiaPrima.findFirst({
      where: { unidad, nombre: { equals: nombre, mode: "insensitive" } },
    });
    if (!retry) throw new Error(`No se pudo crear el insumo "${nombre}"`);
    return retry;
  }
}

/** Suma stock y registra movimiento de entrada por compra. */
export async function entradaStockCompra(
  tx: Tx,
  params: {
    materiaPrimaId: string;
    cantidad: number;
    facturaProveedorId: string;
    usuarioId?: string | null;
    observaciones?: string | null;
  }
) {
  const actual = await tx.materiaPrima.findUnique({ where: { id: params.materiaPrimaId } });
  if (!actual) throw new Error("Materia prima no encontrada");

  const saldo = Math.round((Number(actual.stockActual) + params.cantidad) * 1000) / 1000;
  await tx.materiaPrima.update({
    where: { id: params.materiaPrimaId },
    data: { stockActual: saldo },
  });
  await tx.movimientoStock.create({
    data: {
      materiaPrimaId: params.materiaPrimaId,
      tipo: "ENTRADA_COMPRA",
      cantidad: params.cantidad,
      saldoResultante: saldo,
      facturaProveedorId: params.facturaProveedorId,
      usuarioId: params.usuarioId ?? null,
      observaciones: params.observaciones ?? null,
    },
  });
  return saldo;
}
