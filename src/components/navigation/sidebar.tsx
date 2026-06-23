"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ShoppingCart,
  ChefHat,
  DollarSign,
  Settings,
  BarChart3,
  LogOut,
  Home,
  X,
  Menu,
  FileText,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Rol } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Rol[];
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: <Home className="h-5 w-5" />,
    roles: ["ADMIN", "OPERARIO", "VENDEDOR", "CLIENTE"],
  },
  {
    href: "/dashboard/pedidos",
    label: "Pedidos",
    icon: <ShoppingCart className="h-5 w-5" />,
    roles: ["ADMIN", "OPERARIO", "VENDEDOR", "CLIENTE"],
  },
  {
    href: "/dashboard/produccion",
    label: "Producción",
    icon: <ChefHat className="h-5 w-5" />,
    roles: ["ADMIN", "OPERARIO"],
  },
  {
    href: "/dashboard/cobranza",
    label: "Cobranza",
    icon: <DollarSign className="h-5 w-5" />,
    roles: ["ADMIN", "OPERARIO"],
  },
  {
    href: "/dashboard/facturacion",
    label: "Facturación",
    icon: <FileText className="h-5 w-5" />,
    roles: ["ADMIN", "OPERARIO", "VENDEDOR"],
  },
  {
    href: "/dashboard/admin/proveedores/facturas",
    label: "Fact. Proveedores",
    icon: <Truck className="h-5 w-5" />,
    roles: ["ADMIN", "OPERARIO"],
  },
  {
    href: "/dashboard/reportes",
    label: "Reportes",
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ["ADMIN", "OPERARIO"],
  },
  {
    href: "/dashboard/admin",
    label: "Administración",
    icon: <Settings className="h-5 w-5" />,
    roles: ["ADMIN"],
  },
];

interface SidebarProps {
  userRol: Rol;
  userName: string;
}

export function Sidebar({ userRol, userName }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const filteredNav = navItems.filter((item) => item.roles.includes(userRol));

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-pink-700">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg">
          🍰
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">Postres Tammy</p>
          <p className="text-pink-200 text-xs">Light</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-pink-100 hover:bg-white/10 hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-pink-700 space-y-2">
        <div className="px-3 py-2">
          <p className="text-white text-sm font-medium truncate">{userName}</p>
          <p className="text-pink-200 text-xs">{userRol.toLowerCase()}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-pink-100 hover:bg-white/10 hover:text-white"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-pink-600 text-white p-2 rounded-lg shadow-lg"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-pink-600 transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-pink-600 min-h-screen flex-shrink-0">
        <NavContent />
      </aside>
    </>
  );
}
