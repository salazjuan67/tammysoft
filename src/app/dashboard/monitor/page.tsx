"use client";

import { Suspense } from "react";
import { MonitorApp } from "@/components/monitor/MonitorApp";

export default function MonitorPage() {
  return (
    <Suspense fallback={<div className="grid h-[100dvh] place-items-center text-sm text-gray-500">Cargando Tammy Ops…</div>}>
      <MonitorApp />
    </Suspense>
  );
}
