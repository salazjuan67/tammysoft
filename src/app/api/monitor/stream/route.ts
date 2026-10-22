import { auth } from "@/lib/auth";
import { onPedidosChanged, pedidosVersion } from "@/lib/monitor/changes";

/**
 * SSE: avisa "cambiaron pedidos" para que el monitor recargue al instante.
 * No manda datos; el cliente vuelve a pedir /api/monitor. El ping mantiene viva la conexión detrás de Nginx.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return new Response("No autorizado", { status: 401 });
  const rol = (session.user as { rol: string }).rol;
  if (!["ADMIN", "OPERARIO"].includes(rol)) return new Response("Sin acceso", { status: 403 });

  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(enc.encode(chunk));
        } catch {
          cleanup();
        }
      };
      send(`retry: 5000\nevent: hello\ndata: ${pedidosVersion()}\n\n`);
      const off = onPedidosChanged(() => send(`event: change\ndata: ${pedidosVersion()}\n\n`));
      const ping = setInterval(() => send(": ping\n\n"), 20_000);
      cleanup = () => {
        off();
        clearInterval(ping);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
