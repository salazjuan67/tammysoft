import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || typeof credentials.email !== "string") return null;
        const email = credentials.email.trim().toLowerCase();

        const usuario = await db.usuario.findUnique({
          where: { email },
          include: { clienteAsociado: true },
        });

        if (!usuario || !usuario.activo) return null;

        // Clients log in with email only (no password)
        if (usuario.rol === "CLIENTE") {
          return {
            id: usuario.id,
            email: usuario.email,
            name: usuario.nombre,
            rol: usuario.rol,
            clienteId: usuario.clienteId,
          };
        }

        // Staff (ADMIN, OPERARIO, VENDEDOR) require password
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const passwordValida = await bcrypt.compare(parsed.data.password, usuario.passwordHash);
        if (!passwordValida) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombre,
          rol: usuario.rol,
          clienteId: usuario.clienteId,
        };
      },
    }),
  ],
  callbacks: {
    // Returning true here prevents NextAuth from auto-redirecting in middleware.
    // All authorization logic is handled by our custom proxy.ts middleware.
    authorized() {
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.rol = (user as { rol: string }).rol;
        token.clienteId = (user as { clienteId?: string }).clienteId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as { rol: string }).rol = token.rol as string;
        (session.user as { clienteId?: string }).clienteId = token.clienteId as string | undefined;
      }
      return session;
    },
  },
});
