import type {
  Usuario,
  Cliente,
  Categoria,
  Producto,
  Pedido,
  PedidoItem,
  Factura,
  Pago,
  Proveedor,
  PagoProveedor,
  Rol,
  EstadoPedido,
  RangoHorario,
  EstadoFactura,
  TipoPago,
} from "@prisma/client";

// Re-export Prisma types
export type {
  Usuario,
  Cliente,
  Categoria,
  Producto,
  Pedido,
  PedidoItem,
  Factura,
  Pago,
  Proveedor,
  PagoProveedor,
  Rol,
  EstadoPedido,
  RangoHorario,
  EstadoFactura,
  TipoPago,
};

// ─── Extended / Joined types ──────────────────────────────────────────────────

export type ProductoConCategoria = Producto & {
  categoria: Categoria;
};

export type PedidoItemConProducto = PedidoItem & {
  producto: ProductoConCategoria;
};

export type PedidoCompleto = Pedido & {
  cliente: Cliente;
  items: PedidoItemConProducto[];
  factura: Factura | null;
  usuarioCreador: { id: string; nombre: string };
};

export type PedidoResumen = Pedido & {
  cliente: { id: string; nombre: string };
  _count: { items: number };
};

export type FacturaCompleta = Factura & {
  pedido: PedidoCompleto;
  cliente: Cliente;
  pagos: Pago[];
};

export type ClienteConDeuda = Cliente & {
  _count: { pedidos: number };
  deudaTotal: number;
};

export type ResumenFinanciero = {
  totalEfectivo: number;
  totalTransferencias: number;
  totalCobrado: number;
  totalDeuda: number;
};

// ─── API Response types ───────────────────────────────────────────────────────

export type ApiResponse<T = unknown> = {
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ─── Session extension ────────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      rol: Rol;
      clienteId?: string;
    };
  }
}
