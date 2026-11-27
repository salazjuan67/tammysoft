import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { extraerFacturaConGemini } from "@/lib/geminiOcr";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userRol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(userRol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("imagen");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Subí una foto de la factura" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen no puede superar 8 MB" }, { status: 400 });
  }
  const mime = file.type || "image/jpeg";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ error: "Formato no soportado. Usá JPG, PNG o WebP" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  try {
    const extraido = await extraerFacturaConGemini(base64, mime);

    // Buscar proveedor por nombre; si no existe, crearlo y devolverlo seleccionado.
    let proveedor: { id: string; nombre: string } | null = null;
    let proveedorCreado = false;
    const nombreProv = extraido.proveedorNombre?.trim();
    if (nombreProv) {
      proveedor = await db.proveedor.findFirst({
        where: { nombre: { equals: nombreProv, mode: "insensitive" } },
        select: { id: true, nombre: true, activo: true },
      }).then(async (p) => {
        if (!p) return null;
        if (!p.activo) {
          await db.proveedor.update({ where: { id: p.id }, data: { activo: true } });
        }
        return { id: p.id, nombre: p.nombre };
      });

      if (!proveedor) {
        // Match flexible por contiene (ej. razón social larga en la factura)
        proveedor = await db.proveedor.findFirst({
          where: {
            activo: true,
            nombre: { contains: nombreProv, mode: "insensitive" },
          },
          select: { id: true, nombre: true },
        });
      }

      if (!proveedor) {
        const creado = await db.proveedor.create({
          data: { nombre: nombreProv, activo: true },
          select: { id: true, nombre: true },
        });
        proveedor = creado;
        proveedorCreado = true;
      }
    }

    return NextResponse.json({
      data: {
        ...extraido,
        proveedorId: proveedor?.id ?? null,
        proveedor,
        proveedorCreado,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo leer la factura";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
