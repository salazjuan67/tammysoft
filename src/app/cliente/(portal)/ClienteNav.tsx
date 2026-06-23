"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ShoppingCart, FileText, DollarSign, Home, LogOut } from "lucide-react";
import type { Session } from "next-auth";

const NAV_LINKS = [
  { href: "/cliente/dashboard", label: "Inicio", icon: Home },
  { href: "/cliente/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/cliente/facturas", label: "Facturas", icon: FileText },
  { href: "/cliente/deuda", label: "Mi deuda", icon: DollarSign },
];

export default function ClienteNav({ session }: { session: Session | null }) {
  const pathname = usePathname();

  if (!session) return null;

  return (
    <header className="bg-white border-b border-pink-100 shadow-sm sticky top-0 z-40 print:hidden">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/cliente/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-bold text-pink-600">🍰 Tammy Light</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? "bg-pink-100 text-pink-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User + logout */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:block">
            {session.user?.name}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/cliente/login" })}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:block">Salir</span>
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden flex border-t border-pink-100">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              pathname.startsWith(href)
                ? "text-pink-600"
                : "text-gray-500"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
