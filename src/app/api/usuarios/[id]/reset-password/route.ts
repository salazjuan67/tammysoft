import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol: string }).rol;
  if (userRol !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores pueden enviar mails de recuperación" }, { status: 403 });
  }

  const { id } = await params;

  const usuario = await db.usuario.findUnique({ where: { id } });
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (!usuario.activo) return NextResponse.json({ error: "El usuario está inactivo" }, { status: 400 });

  // Invalidar tokens anteriores del mismo usuario
  await db.passwordResetToken.updateMany({
    where: { usuarioId: id, usado: false },
    data: { usado: true },
  });

  // Generar token seguro
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2 horas

  await db.passwordResetToken.create({
    data: { token, usuarioId: id, expiresAt },
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/auth/reset-password/${token}`;

  // Enviar mail solo si RESEND_API_KEY está configurada
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "noreply@postrestammy.com.ar",
      to: usuario.email,
      subject: "Recuperación de contraseña — Postres Tammy Light",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #db2777; margin-bottom: 8px;">Postres Tammy Light</h2>
          <h3 style="color: #111; margin-bottom: 16px;">Recuperación de contraseña</h3>
          <p style="color: #444;">Hola <strong>${usuario.nombre}</strong>,</p>
          <p style="color: #444;">El administrador solicitó restablecer tu contraseña. Hacé click en el botón de abajo para crear una nueva:</p>
          <a href="${resetUrl}"
             style="display: inline-block; background: #db2777; color: white; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            Crear nueva contraseña
          </a>
          <p style="color: #888; font-size: 13px;">Este link expira en <strong>2 horas</strong>. Si no lo pediste vos, ignorá este mail.</p>
          <p style="color: #bbb; font-size: 12px;">O copiá este link en tu navegador:<br/>${resetUrl}</p>
        </div>
      `,
    });
    if (error) {
      console.error("Error enviando mail:", error);
      return NextResponse.json({ error: "Error al enviar el mail. Verificá la API key de Resend." }, { status: 500 });
    }
    return NextResponse.json({ message: `Mail enviado a ${usuario.email}` });
  }

  // Sin RESEND_API_KEY: devolver el link para uso manual
  console.log("Reset link (sin Resend):", resetUrl);
  return NextResponse.json({ message: `Link generado. Resend no configurado.`, resetUrl });
}
