"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp, X, ChevronDown, BookOpen } from "lucide-react";
import {
  tutorialParaRuta,
  tutorialesDe,
  type AudienciaTutorial,
  type TutorialPantalla,
} from "@/lib/tutoriales";

const AUTO_KEY = "tammy.ayuda.auto";
const VISTOS_KEY = "tammy.ayuda.vistos";

function leerVistos(): string[] {
  try {
    return JSON.parse(localStorage.getItem(VISTOS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function AyudaPantalla({ audiencia }: { audiencia: AudienciaTutorial }) {
  const pathname = usePathname();
  const tutorial = useMemo(() => tutorialParaRuta(pathname, audiencia), [pathname, audiencia]);
  const catalogo = useMemo(() => tutorialesDe(audiencia), [audiencia]);
  const [abierto, setAbierto] = useState(false);
  const [guiaAbierta, setGuiaAbierta] = useState<number | null>(0);
  const [verTodas, setVerTodas] = useState(false);
  const [elegida, setElegida] = useState<TutorialPantalla | null>(null);

  const actual = elegida ?? tutorial;

  useEffect(() => {
    setElegida(null);
    setGuiaAbierta(0);
    setVerTodas(false);
    if (!tutorial) return;
    if (localStorage.getItem(AUTO_KEY) === "off") return;
    const vistos = leerVistos();
    if (!vistos.includes(tutorial.ruta)) {
      setAbierto(true);
      localStorage.setItem(VISTOS_KEY, JSON.stringify([...vistos, tutorial.ruta]));
    }
  }, [tutorial?.ruta]);

  if (!tutorial && catalogo.length === 0) return null;

  function noMostrarAuto() {
    localStorage.setItem(AUTO_KEY, "off");
    setAbierto(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-pink-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-pink-700 print:hidden"
        title="Tutoriales"
      >
        <CircleHelp className="h-5 w-5" />
        <span className="hidden sm:inline">Ayuda</span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 print:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Cerrar" onClick={() => setAbierto(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-pink-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">Tutorial</p>
                <h2 className="text-lg font-bold text-gray-900">{actual?.titulo ?? "Ayuda"}</h2>
              </div>
              <button type="button" onClick={() => setAbierto(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {actual && (
                <>
                  <section className="mb-5">
                    <h3 className="mb-1.5 text-sm font-semibold text-gray-800">Qué hace esta pantalla</h3>
                    <p className="text-sm leading-relaxed text-gray-600">{actual.queHace}</p>
                  </section>

                  {actual.guias.length > 0 && (
                    <section className="mb-5">
                      <h3 className="mb-2 text-sm font-semibold text-gray-800">Cómo hacer</h3>
                      <div className="space-y-2">
                        {actual.guias.map((guia, i) => {
                          const abierta = guiaAbierta === i;
                          return (
                            <div key={guia.titulo} className="overflow-hidden rounded-xl border border-gray-100">
                              <button
                                type="button"
                                onClick={() => setGuiaAbierta(abierta ? null : i)}
                                className="flex w-full items-center justify-between gap-2 bg-gray-50 px-3 py-2.5 text-left text-sm font-medium text-gray-800"
                              >
                                {guia.titulo}
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition ${abierta ? "rotate-180" : ""}`} />
                              </button>
                              {abierta && (
                                <ol className="space-y-2 px-4 py-3 text-sm text-gray-600">
                                  {guia.pasos.map((paso, n) => (
                                    <li key={n} className="flex gap-2">
                                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-100 text-[11px] font-bold text-pink-700">
                                        {n + 1}
                                      </span>
                                      <span className="leading-relaxed">{paso}</span>
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </>
              )}

              <section>
                <button
                  type="button"
                  onClick={() => setVerTodas((v) => !v)}
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-pink-700"
                >
                  <BookOpen className="h-4 w-4" />
                  {verTodas ? "Ocultar otras pantallas" : "Ver tutoriales de otras pantallas"}
                </button>
                {verTodas && (
                  <ul className="space-y-1">
                    {catalogo.map((t) => (
                      <li key={t.ruta}>
                        <button
                          type="button"
                          onClick={() => {
                            setElegida(t);
                            setGuiaAbierta(0);
                          }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                            actual?.ruta === t.ruta ? "bg-pink-50 font-medium text-pink-800" : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {t.titulo}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="border-t border-gray-100 px-5 py-3">
              <button type="button" onClick={noMostrarAuto} className="text-xs text-gray-400 hover:text-gray-600">
                No abrir el tutorial automáticamente
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
