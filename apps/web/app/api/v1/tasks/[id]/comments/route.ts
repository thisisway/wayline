import { addComment, getTaskComments, logActivity } from "@wayline/db";
import {
  aiActor,
  forbidden,
  getToken,
  getWriteToken,
  json,
  resolveOrg,
  unauthorized,
} from "@/lib/api-auth";

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

/** POST /api/v1/tasks/:id/comments — adiciona um comentário. Escrita. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const orgId = await resolveOrg(t.userId, body.orgId);
  if (!orgId) return forbidden();
  if (!body.body?.trim()) return json({ error: "body é obrigatório" }, 400);

  const c = await addComment(orgId, {
    taskId: id,
    authorId: t.userId,
    body: String(body.body).slice(0, 5000),
  });
  await logActivity(orgId, id, t.userId, aiActor(t), "comment", null);
  return json({ id: c.id });
}
