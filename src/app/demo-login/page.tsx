"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function DemoLoginPage() {
  useEffect(() => {
    signIn("credentials", {
      email: "demo",
      password: "x",
      callbackUrl: "/dashboard",
      redirect: true,
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50">
      <div className="text-center space-y-3">
        <div className="text-4xl animate-bounce">🍰</div>
        <p className="text-gray-500 text-sm">Ingresando al sistema...</p>
      </div>
    </div>
  );
}
