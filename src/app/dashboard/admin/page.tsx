import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Tag, UserCog, Truck, Settings, FileText } from "lucide-react";

const adminLinks = [
  {
    href: "/dashboard/admin/clientes",
    icon: <Users className="h-6 w-6 text-pink-600" />,
    title: "Clientes",
    description: "Gestionar clientes: agregar, editar y desactivar",
  },
  {
    href: "/dashboard/admin/productos",
    icon: <Package className="h-6 w-6 text-blue-600" />,
    title: "Productos",
    description: "Gestionar el catálogo de postres y precios masivos",
  },
  {
    href: "/dashboard/admin/categorias",
    icon: <Tag className="h-6 w-6 text-green-600" />,
    title: "Categorías",
    description: "Organizar los postres por categorías",
  },
  {
    href: "/dashboard/admin/usuarios",
    icon: <UserCog className="h-6 w-6 text-purple-600" />,
    title: "Usuarios",
    description: "Gestionar accesos y roles del sistema",
  },
  {
    href: "/dashboard/admin/proveedores",
    icon: <Truck className="h-6 w-6 text-amber-600" />,
    title: "Proveedores",
    description: "Proveedores y pagos a proveedores",
  },
  {
    href: "/dashboard/admin/proveedores/facturas",
    icon: <FileText className="h-6 w-6 text-orange-600" />,
    title: "Facturas Proveedores",
    description: "Registrar y gestionar facturas y pagos a proveedores",
  },
  {
    href: "/dashboard/admin/configuracion",
    icon: <Settings className="h-6 w-6 text-gray-600" />,
    title: "Configuración",
    description: "Datos de ejemplo y herramientas de administración",
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
        <p className="text-gray-500 text-sm">Gestión general del sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  {link.icon}
                  <CardTitle className="text-base">{link.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{link.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
