import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const STAFF_ROLES = ["ADMIN", "OPERARIO", "VENDEDOR"];
const CLIENT_ROLES = ["CLIENTE"];

const publicRoutes = ["/auth/login", "/auth/error", "/cliente/login"];
const apiPublicRoutes = ["/api/auth"];

// Role-based route access for staff dashboard
const roleRoutes: Record<string, string[]> = {
  "/dashboard/admin": ["ADMIN"],
  "/dashboard/reportes": ["ADMIN", "OPERARIO"],
  "/dashboard/cobranza": ["ADMIN", "OPERARIO"],
  "/dashboard/produccion": ["ADMIN", "OPERARIO"],
};

export default auth(function middleware(req: NextRequest & { auth: { user: { rol: string } } | null }) {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const userRol = session?.user?.rol;

  // ─── Public routes ───────────────────────────────────────────────────────────
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }
  if (apiPublicRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // ─── Client portal (/cliente/*) ──────────────────────────────────────────────
  if (pathname.startsWith("/cliente")) {
    // Login page is already handled above via publicRoutes → NextResponse.next()
    // If an authenticated client somehow hits /cliente/login, redirect to portal
    if (pathname.startsWith("/cliente/login")) {
      if (session && userRol && CLIENT_ROLES.includes(userRol)) {
        return NextResponse.redirect(new URL("/cliente/dashboard", req.url));
      }
      return NextResponse.next();
    }

    if (!session) {
      return NextResponse.redirect(new URL("/cliente/login", req.url));
    }
    if (!userRol || !CLIENT_ROLES.includes(userRol)) {
      // Staff trying to access client portal → redirect to their dashboard
      if (userRol && STAFF_ROLES.includes(userRol)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/cliente/login", req.url));
    }
    return NextResponse.next();
  }

  // ─── Staff dashboard (/dashboard/*) ──────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!userRol || !STAFF_ROLES.includes(userRol)) {
      // Clients trying to access staff dashboard → redirect to their portal
      if (userRol === "CLIENTE") {
        return NextResponse.redirect(new URL("/cliente/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // Fine-grained role access within dashboard
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(userRol)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  }

  // ─── API routes ──────────────────────────────────────────────────────────────
  if (pathname.startsWith("/api/cliente/")) {
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!userRol || !CLIENT_ROLES.includes(userRol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // All other API routes require any valid session
  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/cliente/:path*",
    "/dashboard/:path*",
    "/api/:path*",
    "/auth/:path*",
  ],
};
