import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DEMO_CLIENT_IDS = ["cli-demo-001", "cli-demo-002", "cli-demo-003", "cli-demo-004"];
const DEMO_ORDER_IDS = [
  "ped-demo-001", "ped-demo-002", "ped-demo-003", "ped-demo-004",
  "ped-demo-005", "ped-demo-006", "ped-demo-007", "ped-demo-008",
];

// Also clean up the manually inserted demo data (without -demo- in ID)
const LEGACY_CLIENT_IDS = ["cli-001", "cli-002", "cli-003", "cli-004", "cliente-demo-001"];
const LEGACY_ORDER_IDS = ["ped-001", "ped-002", "ped-003", "ped-004", "ped-005", "ped-006", "ped-007", "ped-008"];

export async function DELETE() {
  const session = await auth();
  if ((session?.user as { rol?: string })?.rol !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const allOrderIds = [...DEMO_ORDER_IDS, ...LEGACY_ORDER_IDS];
    const allClientIds = [...DEMO_CLIENT_IDS, ...LEGACY_CLIENT_IDS];

    // Delete in FK order
    await db.pedidoItem.deleteMany({ where: { pedidoId: { in: allOrderIds } } });
    await db.alerta.deleteMany({ where: { pedidoId: { in: allOrderIds } } });

    // Delete payments and invoices linked to demo clients
    const facturas = await db.factura.findMany({
      where: { clienteId: { in: allClientIds } },
      select: { id: true },
    });
    const facturaIds = facturas.map((f) => f.id);
    if (facturaIds.length > 0) {
      await db.pago.deleteMany({ where: { facturaId: { in: facturaIds } } });
      await db.factura.deleteMany({ where: { id: { in: facturaIds } } });
    }

    await db.pedido.deleteMany({ where: { id: { in: allOrderIds } } });
    await db.cliente.deleteMany({ where: { id: { in: allClientIds } } });

    return NextResponse.json({
      ok: true,
      message: "Datos de ejemplo eliminados correctamente",
    });
  } catch (error) {
    console.error("Error resetting demo data:", error);
    return NextResponse.json({ error: "Error al eliminar datos de ejemplo" }, { status: 500 });
  }
}
