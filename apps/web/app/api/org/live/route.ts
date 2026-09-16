import { getUserOrgs } from "@wayline/db";
import { auth } from "@/auth";
import { subscribe } from "@/lib/live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOPICS = new Set(["comercial", "financeiro", "members"]);

/**
 * SSE por org+tópico: emite um evento (mesmo nome do tópico) quando aquela
 * área muda. Canal = `<topic>:<orgId>`. Só transmite "algo mudou" — os dados
 * são rebuscados pela action correspondente, que valida acesso.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("unauthorized", { status: 401 });

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  const topic = url.searchParams.get("topic") ?? "";
  if (!orgId || !TOPICS.has(topic)) return new Response("bad request", { status: 400 });

  const orgs = await getUserOrgs(session.user.id);
  if (!orgs.some((o) => o.id === orgId)) return new Response("forbidden", { status: 403 });

  const channel = `${topic}:${orgId}`;
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
