/**
 * Envía mail de bienvenida con usuario y contraseña a usuarios PRODUCCION.
 * Uso: npx tsx --env-file=.env.local scripts/enviar-acceso-produccion.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { randomBytes } from "crypto";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 2 }),
});

type Credencial = {
  nombre: string;
  email: string;
  password: string;
};

const DESTINATARIOS: Credencial[] = [
  {
    nombre: "Luisa Veron",
    email: "luisaveron1980@gmail.com",
    password: `Luisa-${randomBytes(4).toString("hex")}`,
  },
  {
    nombre: "Delia Rodriguez",
    email: "demaro@outlook.com.ar",
    password: `Delia-${randomBytes(4).toString("hex")}`,
  },
];

function htmlBienvenida(nombre: string, email: string, password: string, loginUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #333;">
      <h2 style="color: #db2777; margin-bottom: 4px;">Postres Tammy Light</h2>
      <p style="color: #888; margin-top: 0; font-size: 14px;">Acceso al sistema — Producción y Pedidos</p>

      <p>Hola <strong>${nombre}</strong>,</p>
      <p>
        Te creamos un usuario para que puedas trabajar en <strong>Pedidos</strong> y
        <strong> Producción</strong> en el sistema de Postres Tammy.
      </p>

      <p style="margin: 20px 0 8px;">Para ingresar, abrí este link:</p>
      <a href="${loginUrl}"
         style="display: inline-block; background: #db2777; color: white; padding: 12px 24px;
                border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 20px;">
        Entrar al sistema
      </a>
      <p style="font-size: 13px; color: #888;">O copiá esta dirección en el navegador:<br/>${loginUrl}</p>

      <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 10px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px; font-weight: bold; color: #9d174d;">Tus datos de acceso</p>
        <p style="margin: 4px 0;"><strong>Usuario (email):</strong> ${email}</p>
        <p style="margin: 4px 0;"><strong>Contraseña:</strong> ${password}</p>
      </div>

      <p style="font-size: 14px; color: #555;">
        Al entrar vas a ver solo las secciones de <strong>Pedidos</strong> y
        <strong> Producción</strong>. Si tenés algún problema para ingresar,
        avisá al administrador.
      </p>

      <p style="color: #bbb; font-size: 12px; margin-top: 28px;">
        Postres Tammy Light — este mail se envió automáticamente.
      </p>
    </div>
  `;
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Falta RESEND_API_KEY");
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");

  // Link público del panel (no usar AUTH_URL local / localhost)
  const baseUrl = (
    process.env.PANEL_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://panel.postrestammy.com.ar"
  ).replace(/\/$/, "");
  const loginUrl = `${baseUrl}/auth/login`;
  const from = (process.env.EMAIL_FROM ?? "Postres Tammy <noreply@postrestammy.com.ar>").replace(/^"|"$/g, "");
  const resend = new Resend(apiKey);

  console.log(`\nEnviando accesos desde ${from}`);
  console.log(`Link de login: ${loginUrl}\n`);

  for (const dest of DESTINATARIOS) {
    const passwordHash = await bcrypt.hash(dest.password, 12);
    const usuario = await db.usuario.upsert({
      where: { email: dest.email },
      create: {
        nombre: dest.nombre,
        email: dest.email,
        passwordHash,
        rol: "PRODUCCION",
        activo: true,
      },
      update: {
        nombre: dest.nombre,
        passwordHash,
        rol: "PRODUCCION",
        activo: true,
      },
      select: { email: true, nombre: true },
    });

    const { error, data } = await resend.emails.send({
      from,
      to: dest.email,
      subject: "Tu acceso a Postres Tammy Light — Pedidos y Producción",
      html: htmlBienvenida(dest.nombre, dest.email, dest.password, loginUrl),
    });

    console.log(`${usuario.nombre} <${usuario.email}>`);
    console.log(`  pass: ${dest.password}`);

    if (error) {
      console.error(`  MAIL ERROR:`, error);
      console.log("");
      continue;
    }

    console.log(`  mail: OK (${data?.id ?? "—"})\n`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
