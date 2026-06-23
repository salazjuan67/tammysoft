import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClienteNav from "./ClienteNav";

export const metadata: Metadata = {
  title: "Portal de Clientes — Postres Tammy Light",
  description: "Hacé tus pedidos en línea",
};

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-pink-50">
      <ClienteNav session={session} />
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
