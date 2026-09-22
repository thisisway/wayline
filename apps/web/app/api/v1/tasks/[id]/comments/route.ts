import { getTaskComments } from "@wayline/db";
import { forbidden, getToken, json, resolveOrg, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/tasks/:id/comments?orgId= — comentários compactos da tarefa. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const orgId = await resolveOrg(t.userId, new URL(req.url).searchParams.get("orgId"));
  if (!orgId) return forbidden();

  const comments = await getTaskComments(orgId, id);
  return json({
    comments: comments.map((c) => ({
      id: c.id,
      author: c.author?.name ?? c.guestName ?? "—",
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
