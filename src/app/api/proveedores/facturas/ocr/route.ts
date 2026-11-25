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

    // Intentar matchear proveedor por nombre
    let proveedorId: string | null = null;
    if (extraido.proveedorNombre) {
      const proveedor = await db.proveedor.findFirst({
        where: {
          activo: true,
          nombre: { contains: extraido.proveedorNombre.trim(), mode: "insensitive" },
        },
        select: { id: true, nombre: true },
      });
      if (proveedor) proveedorId = proveedor.id;
    }

    return NextResponse.json({
      data: {
        ...extraido,
        proveedorId,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo leer la factura";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
