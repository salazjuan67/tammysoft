/**
 * Determines whether a client can still edit or cancel a pending order.
 *
 * Two overlapping windows grant edit rights:
 *   Window A — before midnight the day prior to delivery (i.e. up to 11:59 PM the day before)
 *   Window B — within 2 hours of order creation
 */

export interface ValidacionEdicion {
  puede_editar: boolean;
  /** Latest datetime until which editing is allowed (null if already past both windows) */
  limite: Date | null;
  /** Human-readable reason when editing is denied */
  motivo: string | null;
  /** Which window(s) are still open */
  ventanas: {
    ventana_a: { abierta: boolean; limite: Date };
    ventana_b: { abierta: boolean; limite: Date };
  };
}

export function validarEdicionPedido(pedido: {
  estado: string;
  fechaEntrega: Date | string;
  createdAt: Date | string;
}): ValidacionEdicion {
  const ahora = new Date();
  const fechaEntrega = new Date(pedido.fechaEntrega);
  const createdAt = new Date(pedido.createdAt);

  // Only PENDIENTE orders can be edited
  if (pedido.estado !== "PENDIENTE") {
    return {
      puede_editar: false,
      limite: null,
      motivo: `El pedido está en estado ${pedido.estado} y no puede modificarse.`,
      ventanas: {
        ventana_a: { abierta: false, limite: getMedianocheDiaEntrega(fechaEntrega) },
        ventana_b: { abierta: false, limite: getDosHoras(createdAt) },
      },
    };
  }

  // Window A: before midnight the day before delivery (23:59 PM the prior day)
  const limiteA = getMedianocheDiaEntrega(fechaEntrega);
  const ventanaA = ahora < limiteA;

  // Window B: within 2 hours of creation
  const limiteB = getDosHoras(createdAt);
  const ventanaB = ahora < limiteB;

  const puede_editar = ventanaA || ventanaB;

  // Earliest active limit (the one the client has least time on)
  let limite: Date | null = null;
  if (ventanaA && ventanaB) {
    limite = limiteA < limiteB ? limiteA : limiteB;
  } else if (ventanaA) {
    limite = limiteA;
  } else if (ventanaB) {
    limite = limiteB;
  }

  return {
    puede_editar,
    limite,
    motivo: puede_editar
      ? null
      : `El período de edición terminó. El límite era ${formatLimite(limiteA < limiteB ? limiteA : limiteB)}.`,
    ventanas: {
      ventana_a: { abierta: ventanaA, limite: limiteA },
      ventana_b: { abierta: ventanaB, limite: limiteB },
    },
  };
}

function getMedianocheDiaEntrega(fechaEntrega: Date): Date {
  // Midnight = start of the delivery day = end of the prior day (23:59:59)
  const d = new Date(fechaEntrega);
  d.setHours(0, 0, 0, 0); // 00:00 of the delivery day = limit for edits
  return d;
}

function getDosHoras(createdAt: Date): Date {
  const d = new Date(createdAt);
  d.setHours(d.getHours() + 2);
  return d;
}

function formatLimite(date: Date): string {
  return date.toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
