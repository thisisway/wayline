import { createSubtask, getSubtasks, logActivity } from "@wayline/db";
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

/** GET /api/v1/tasks/:id/subtasks?orgId= — subtarefas (id, título, concluída). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const orgId = await resolveOrg(t.userId, new URL(req.url).searchParams.get("orgId"));
  if (!orgId) return forbidden();
  return json({ subtasks: await getSubtasks(orgId, id) });
}

/** POST /api/v1/tasks/:id/subtasks — cria uma subtarefa. Escrita. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const orgId = await resolveOrg(t.userId, body.orgId);
  if (!orgId) return forbidden();
  if (!body.title?.trim()) return json({ error: "title é obrigatório" }, 400);

  const sub = await createSubtask(orgId, id, String(body.title).slice(0, 300));
  await logActivity(orgId, id, t.userId, aiActor(t), "subtask", sub.title);
  return json({ id: sub.id });
}
