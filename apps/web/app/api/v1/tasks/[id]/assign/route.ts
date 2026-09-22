import { getTaskCard, logActivity, updateTask } from "@wayline/db";
import {
  aiActor,
  forbidden,
  getWriteToken,
  json,
  notFound,
  resolveOrg,
  unauthorized,
} from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/v1/tasks/:id/assign — define os responsáveis (substitui). Escrita. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const orgId = await resolveOrg(t.userId, body.orgId);
  if (!orgId) return forbidden();
  if (!Array.isArray(body.assigneeIds)) {
    return json({ error: "assigneeIds[] é obrigatório" }, 400);
  }

  const existing = await getTaskCard(orgId, id);
  if (!existing) return notFound();
  if (!existing.statusId) return json({ error: "tarefa sem status" }, 400);

  await updateTask(orgId, {
    id,
    statusId: existing.statusId,
    title: existing.title,
    description: existing.description,
    cover: existing.cover,
    priority: existing.priority,
    clientId: existing.client?.id ?? null,
    startDate: existing.startDate,
    dueDate: existing.dueDate,
    estimateMinutes: existing.estimateMinutes,
    recurrence: existing.recurrence,
    assigneeIds: body.assigneeIds,
    tags: existing.tags,
  });
  await logActivity(orgId, id, t.userId, aiActor(t), "assignees", `${body.assigneeIds.length} responsável(is)`);
  return json({ ok: true });
}
