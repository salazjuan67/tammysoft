import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DEMO_CLIENT_IDS = ["cli-demo-001", "cli-demo-002", "cli-demo-003", "cli-demo-004"];
const DEMO_ORDER_IDS = [
  "ped-demo-001", "ped-demo-002", "ped-demo-003", "ped-demo-004",
  "ped-demo-005", "ped-demo-006", "ped-demo-007", "ped-demo-008",
];

export async function POST() {
  const session = await auth();
  if ((session?.user as { rol?: string })?.rol !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    // Verify no demo data already exists
    const existing = await db.cliente.count({ where: { id: { in: DEMO_CLIENT_IDS } } });
    if (existing > 0) {
      return NextResponse.json({ error: "Los datos de ejemplo ya existen. Elimininalos primero." }, { status: 409 });
    }

    // Fetch real products to use in orders
    const productos = await db.producto.findMany({
      where: { activo: true },
      take: 20,
      orderBy: { createdAt: "asc" },
    });

    if (productos.length < 4) {
      return NextResponse.json({ error: "No hay suficientes productos activos para crear pedidos de ejemplo." }, { status: 400 });
    }

    const p = (i: number) => productos[i % productos.length];
    const adminId = session?.user?.id ?? "admin-001";

    const hoy = new Date();
    const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
    const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
    const pasado = new Date(hoy); pasado.setDate(hoy.getDate() + 2);

    // Create demo clients
    await db.cliente.createMany({
      data: [
        { id: "cli-demo-001", nombre: "María García (Demo)", email: "maria.demo@ejemplo.com", telefono: "11-4521-3300", direccion: "Av. Rivadavia 1234, CABA", estado: true },
        { id: "cli-demo-002", nombre: "Laura Martínez (Demo)", email: "laura.demo@ejemplo.com", telefono: "11-5533-8800", direccion: "Corrientes 567, CABA", estado: true },
        { id: "cli-demo-003", nombre: "Carolina López (Demo)", email: "carolina.demo@ejemplo.com", telefono: "11-4488-2211", direccion: "Belgrano 890, CABA", estado: true },
        { id: "cli-demo-004", nombre: "Sofía Rodríguez (Demo)", email: "sofia.demo@ejemplo.com", telefono: "11-6677-4422", direccion: "Palermo 321, CABA", estado: true },
      ],
    });

    // Helper: price as number
    const price = (prod: typeof productos[0]) => Number(prod.precio);

    // Create orders with items
    const ordersData = [
      {
        id: DEMO_ORDER_IDS[0], clienteId: "cli-demo-001", fechaEntrega: manana, rangoHorario: "H9_10" as const,
        estado: "PENDIENTE" as const, notas: "Entregar en portería",
        items: [{ prod: p(0), qty: 3 }, { prod: p(2), qty: 2 }],
      },
      {
        id: DEMO_ORDER_IDS[1], clienteId: "cli-demo-002", fechaEntrega: hoy, rangoHorario: "H14_16" as const,
        estado: "EN_PRODUCCION" as const, notas: null,
        items: [{ prod: p(12), qty: 4 }, { prod: p(13), qty: 2 }],
      },
      {
        id: DEMO_ORDER_IDS[2], clienteId: "cli-demo-003", fechaEntrega: hoy, rangoHorario: "H9_10" as const,
        estado: "PENDIENTE" as const, notas: "Sin gluten por favor",
        items: [{ prod: p(21), qty: 5 }, { prod: p(23), qty: 3 }],
      },
      {
        id: DEMO_ORDER_IDS[3], clienteId: "cli-demo-004", fechaEntrega: pasado, rangoHorario: "H14_16" as const,
        estado: "PENDIENTE" as const, notas: "Para cumpleaños",
        items: [{ prod: p(1), qty: 6 }, { prod: p(9), qty: 4 }, { prod: p(27), qty: 2 }],
      },
      {
        id: DEMO_ORDER_IDS[4], clienteId: "cli-demo-001", fechaEntrega: ayer, rangoHorario: "H10_12" as const,
        estado: "ENTREGADO" as const, notas: null,
        items: [{ prod: p(22), qty: 4 }, { prod: p(0), qty: 3 }],
      },
      {
        id: DEMO_ORDER_IDS[5], clienteId: "cli-demo-002", fechaEntrega: hoy, rangoHorario: "H16_18" as const,
        estado: "PENDIENTE" as const, notas: "Pote grande para evento",
        items: [{ prod: p(3), qty: 10 }, { prod: p(4), qty: 5 }],
      },
      {
        id: DEMO_ORDER_IDS[6], clienteId: "cli-demo-003", fechaEntrega: manana, rangoHorario: "H12_14" as const,
        estado: "PENDIENTE" as const, notas: null,
        items: [{ prod: p(21), qty: 3 }, { prod: p(27), qty: 3 }, { prod: p(12), qty: 2 }],
      },
      {
        id: DEMO_ORDER_IDS[7], clienteId: "cli-demo-004", fechaEntrega: ayer, rangoHorario: "H14_16" as const,
        estado: "CANCELADO" as const, notas: "Cancelado por cliente",
        items: [{ prod: p(0), qty: 4 }],
      },
    ];

    for (const order of ordersData) {
      const montoTotal = order.items.reduce((sum, i) => sum + price(i.prod) * i.qty, 0);
      await db.pedido.create({
        data: {
          id: order.id,
          clienteId: order.clienteId,
          usuarioCreadorId: adminId,
          fechaEntrega: order.fechaEntrega,
          rangoHorario: order.rangoHorario,
          estado: order.estado,
          montoTotal,
          notas: order.notas,
          items: {
            create: order.items.map((i) => ({
              productoId: i.prod.id,
              cantidad: i.qty,
              precioUnitario: price(i.prod),
              subtotal: price(i.prod) * i.qty,
            })),
          },
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Datos de ejemplo creados correctamente",
      clientes: DEMO_CLIENT_IDS.length,
      pedidos: DEMO_ORDER_IDS.length,
    });
  } catch (error) {
    console.error("Error seeding demo data:", error);
    return NextResponse.json({ error: "Error al crear datos de ejemplo" }, { status: 500 });
  }
}
