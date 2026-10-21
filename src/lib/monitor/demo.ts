import { buildSnapshot } from "./buildSnapshot";
import type { PedidoFuente } from "./adapter";
import { fechaKey } from "./time";

export function demoSnapshot(fecha = fechaKey()) {
  const base = `${fecha}T12:00:00.000-03:00`;
  const pedidos: PedidoFuente[] = [
    { id: "demo-pend-1", estado: "PENDIENTE", fechaEntrega: `${fecha}T00:00:00.000Z`, rangoHorario: "H16_18", notas: "Carla", createdAt: base, cliente: { nombre: "Dietética Sur" }, items: [{ cantidad: 8, producto: { nombre: "Mousse chocolate", categoria: { nombre: "Mousse" } } }] },
    { id: "demo-pend-2", estado: "PENDIENTE", fechaEntrega: `${fecha}T00:00:00.000Z`, rangoHorario: "H14_16", notas: "Sofía", createdAt: base, cliente: { nombre: "Café Lirios" }, items: [{ cantidad: 12, producto: { nombre: "Cheesecake", categoria: { nombre: "Tortas" } } }] },
    { id: "demo-prod-1", estado: "EN_PRODUCCION", fechaEntrega: `${fecha}T00:00:00.000Z`, fechaProduccion: base, rangoHorario: "H12_14", notas: "Mariana", createdAt: base, cliente: { nombre: "Diet. Belgrano" }, items: [{ cantidad: 12, producto: { nombre: "Mousse", categoria: { nombre: "Mousse" } } }, { cantidad: 8, producto: { nombre: "Cheesecake", categoria: { nombre: "Tortas" } } }] },
    { id: "demo-prod-2", estado: "EN_PRODUCCION", fechaEntrega: `${fecha}T00:00:00.000Z`, fechaProduccion: base, rangoHorario: "H16_18", notas: "Lucía", createdAt: base, cliente: { nombre: "Eventos BA" }, items: [{ cantidad: 20, producto: { nombre: "Marroc", categoria: { nombre: "Mousse" } } }] },
    { id: "demo-store-1", estado: "EN_PRODUCCION", fechaEntrega: `${fecha}T00:00:00.000Z`, fechaProduccion: base, rangoHorario: "H16_18", numeroHeladera: "1", estante: "A", notas: "Martín", createdAt: base, cliente: { nombre: "Diet. Belgrano" }, items: [{ cantidad: 10, producto: { nombre: "Bon o bon", categoria: { nombre: "Mousse" } } }] },
    { id: "demo-store-2", estado: "EN_PRODUCCION", fechaEntrega: `${fecha}T00:00:00.000Z`, fechaProduccion: base, rangoHorario: "H12_14", numeroHeladera: "2", estante: "B", notas: "Valeria", createdAt: base, cliente: { nombre: "Empresa XY" }, items: [{ cantidad: 16, producto: { nombre: "Nutella", categoria: { nombre: "Mousse" } } }] },
    { id: "demo-del-1", estado: "ENTREGADO", fechaEntrega: `${fecha}T00:00:00.000Z`, rangoHorario: "H9_10", notas: "Paula M.", createdAt: base, updatedAt: base, cliente: { nombre: "Colegio Norte" }, items: [{ cantidad: 6, producto: { nombre: "Oreo", categoria: { nombre: "Mousse" } } }] },
    { id: "demo-del-2", estado: "ENTREGADO", fechaEntrega: `${fecha}T00:00:00.000Z`, rangoHorario: "H7_8", notas: "San Isidro", createdAt: base, updatedAt: base, cliente: { nombre: "Palermo Shop" }, items: [{ cantidad: 4, producto: { nombre: "Chocolate suizo", categoria: { nombre: "Mousse" } } }] },
  ];
  const snap = buildSnapshot(pedidos, fecha);
  return { ...snap, demo: true as const };
}
