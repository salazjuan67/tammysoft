import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    return NextResponse.json({ error: issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { token, password } = parsed.data;

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { usuario: true },
  });

  if (!resetToken) {
    return NextResponse.json({ error: "Link inválido o ya fue utilizado" }, { status: 400 });
  }

  if (resetToken.usado) {
    return NextResponse.json({ error: "Este link ya fue utilizado" }, { status: 400 });
  }

  if (new Date() > resetToken.expiresAt) {
    return NextResponse.json({ error: "El link expiró. Pedile al admin que te envíe uno nuevo" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.$transaction([
    db.usuario.update({
      where: { id: resetToken.usuarioId },
      data: { passwordHash },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usado: true },
    }),
  ]);

  return NextResponse.json({ message: "Contraseña actualizada correctamente" });
}

// Validar token (GET) — para verificar antes de mostrar el formulario
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 });

  const resetToken = await db.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken || resetToken.usado || new Date() > resetToken.expiresAt) {
    return NextResponse.json({ valido: false });
  }

  return NextResponse.json({ valido: true });
}
