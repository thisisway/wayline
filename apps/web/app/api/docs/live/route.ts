import { auth } from "@/auth";
import { subscribe } from "@/lib/live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSE por documento: emite `doc` quando o conteúdo é salvo por alguém.
 * Só transmite um "aviso de mudança" (timestamp) — o conteúdo em si é buscado
 * por getPageAction, que já valida acesso à org. Por isso basta exigir sessão.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("unauthorized", { status: 401 });

  const docId = new URL(req.url).searchParams.get("docId");
  if (!docId) return new Response("docId required", { status: 400 });
  const channel = `doc:${docId}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      const unsub = subscribe(channel, (payload) => {
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          /* controller fechado */
        }
      });
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* noop */
        }
      }, 25000);
      req.signal.addEventListener("abort", () => {
        clearInterval(ping);
        unsub();
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
