import { auth } from "@/auth";
import { subscribe } from "@/lib/live";

export const dynamic = "force-dynamic";
// Precisa do runtime Node (stream de longa duração + módulo compartilhado).
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("unauthorized", { status: 401 });

  const listId = new URL(req.url).searchParams.get("listId");
  if (!listId) return new Response("listId required", { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      const unsub = subscribe(listId, (payload) => {
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          /* controller fechado */
        }
      });
      // keepalive para não deixar a conexão morrer em proxies.
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
