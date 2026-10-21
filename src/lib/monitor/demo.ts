import { buildSnapshot } from "./buildSnapshot";
import type { PedidoFuente } from "./adapter";
import { fechaKey } from "./time";

const CLIENTES = ["Dietética Sur", "Café Lirios", "Diet. Belgrano", "Eventos BA", "Empresa XY", "Colegio Norte", "Palermo Shop", "Almacén Rosa"];
const FINALES = ["Carla", "Sofía", "Mariana", "Lucía", "Martín", "Valeria", "Paula M.", "San Isidro", "Gonzalo", "Inés", "Tomás", "Romina"];
const PRODUCTOS: Array<[string, string]> = [
  ["Mousse chocolate", "Mousse"], ["Cheesecake", "Tortas"], ["Marroc", "Mousse"], ["Bon o bon", "Mousse"],
  ["Nutella", "Mousse"], ["Oreo", "Mousse"], ["Chocolate suizo", "Mousse"], ["Lemon pie", "Tortas"],
];
const RANGOS = ["H7_8", "H9_10", "H10_12", "H12_14", "H14_16", "H16_18"];

/** Día cargado de ejemplo: 5 por hacer, 12 en producción, 8 listos en heladera, 4 ya retirados. */
export function demoSnapshot(fecha = fechaKey()) {
  const base = `${fecha}T12:00:00.000-03:00`;
  const fechaEntrega = `${fecha}T00:00:00.000Z`;
  const pedidos: PedidoFuente[] = [];
  let n = 0;
  const push = (estado: PedidoFuente["estado"], extra: Partial<PedidoFuente> = {}) => {
    const i = n++;
    const [nombre, categoria] = PRODUCTOS[i % PRODUCTOS.length];
    const [nombre2, categoria2] = PRODUCTOS[(i + 3) % PRODUCTOS.length];
    pedidos.push({
      id: `demo-${estado.toLowerCase()}-${i}`,
      estado,
      fechaEntrega,
      rangoHorario: RANGOS[i % RANGOS.length],
      notas: FINALES[i % FINALES.length],
      createdAt: base,
      cliente: { nombre: CLIENTES[i % CLIENTES.length] },
      items: [
        { cantidad: 4 + (i % 5) * 4, producto: { nombre, categoria: { nombre: categoria } } },
        ...(i % 3 === 0 ? [{ cantidad: 6, producto: { nombre: nombre2, categoria: { nombre: categoria2 } } }] : []),
      ],
      ...extra,
    });
  };

  for (let i = 0; i < 5; i++) push("PENDIENTE");
  for (let i = 0; i < 12; i++) push("EN_PRODUCCION", { fechaProduccion: base });
  for (let i = 0; i < 8; i++) {
    push("ENTREGADO", { fechaProduccion: base, updatedAt: base, numeroHeladera: String((i % 3) + 1), estante: ["A", "B", "C"][Math.floor(i / 3) % 3] });
  }
  for (let i = 0; i < 4; i++) push("ENTREGADO", { updatedAt: base, fechaRetiro: base, numeroHeladera: String((i % 3) + 1) });

  const snap = buildSnapshot(pedidos, fecha);
  return { ...snap, demo: true as const };
}
