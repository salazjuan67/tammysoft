import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

// ─── Cliente ─────────────────────────────────────────────────────────────────
export const clienteSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  notas: z.string().optional(),
  estado: z.boolean().default(true),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

// ─── Categoría ───────────────────────────────────────────────────────────────
export const categoriaSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  descripcion: z.string().optional(),
  orden: z.number().int().default(0),
  activo: z.boolean().default(true),
});

export type CategoriaInput = z.infer<typeof categoriaSchema>;

// ─── Producto ─────────────────────────────────────────────────────────────────
export const productoSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  descripcion: z.string().optional(),
  categoriaId: z.string().min(1, "Debe seleccionar una categoría"),
  precio: z.coerce
    .number()
    .positive("El precio debe ser mayor a 0")
    .multipleOf(0.01, "Máximo 2 decimales"),
  activo: z.boolean().default(true),
});

export type ProductoInput = z.infer<typeof productoSchema>;

// ─── Precio masivo ────────────────────────────────────────────────────────────
export const precioMasivoItemSchema = z.object({
  productoId: z.string(),
  precio: z.coerce.number().positive("El precio debe ser mayor a 0"),
});

export const precioMasivoSchema = z.object({
  items: z.array(precioMasivoItemSchema).min(1),
});

// ─── Pedido ───────────────────────────────────────────────────────────────────
export const pedidoItemSchema = z.object({
  productoId: z.string().min(1),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  precioUnitario: z.coerce.number().positive(),
});

export const pedidoSchema = z.object({
  clienteId: z.string().min(1, "Debe seleccionar un cliente"),
  fechaEntrega: z.coerce.date({ error: "Fecha inválida" }),
  rangoHorario: z.enum([
    "H5_6", "H7_8", "H9_10", "H10_12", "H12_14", "H14_16", "H16_18", "SIN_ESPECIFICAR",
  ]),
  notas: z.string().optional(),
  items: z
    .array(pedidoItemSchema)
    .min(1, "El pedido debe tener al menos un producto"),
});

export type PedidoInput = z.infer<typeof pedidoSchema>;

// ─── Pago ─────────────────────────────────────────────────────────────────────
export const pagoSchema = z.object({
  clienteId: z.string().min(1),
  facturaId: z.string().optional(),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  tipoPago: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
  fechaPago: z.coerce.date().default(() => new Date()),
  observaciones: z.string().optional(),
});

export type PagoInput = z.infer<typeof pagoSchema>;

// ─── Proveedor ────────────────────────────────────────────────────────────────
export const proveedorSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  contacto: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  notas: z.string().optional(),
});

export type ProveedorInput = z.infer<typeof proveedorSchema>;

// ─── Pago proveedor ───────────────────────────────────────────────────────────
export const pagoProveedorSchema = z.object({
  proveedorId: z.string().min(1),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  tipoPago: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
  fechaPago: z.coerce.date().default(() => new Date()),
  concepto: z.string().optional(),
});

export type PagoProveedorInput = z.infer<typeof pagoProveedorSchema>;

// ─── Usuario ─────────────────────────────────────────────────────────────────
export const usuarioSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
  rol: z.enum(["ADMIN", "OPERARIO", "VENDEDOR", "CLIENTE"]),
  activo: z.boolean().default(true),
  clienteId: z.string().optional(),
});

export type UsuarioInput = z.infer<typeof usuarioSchema>;
