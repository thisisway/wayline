import { getUserOrgs } from "@wayline/db";
import { auth } from "@/auth";
import { subscribe } from "@/lib/live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** SSE por org: emite `comercial` quando propostas/funil mudam. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("unauthorized", { status: 401 });

  const orgId = new URL(req.url).searchParams.get("orgId");
  if (!orgId) return new Response("orgId required", { status: 400 });
  const orgs = await getUserOrgs(session.user.id);
  if (!orgs.some((o) => o.id === orgId)) return new Response("forbidden", { status: 403 });

  const channel = `comercial:${orgId}`;
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
