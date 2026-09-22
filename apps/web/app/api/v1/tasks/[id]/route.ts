import { deleteTask, getTaskCard, logActivity, updateTask } from "@wayline/db";
import {
  aiActor,
  forbidden,
  getToken,
  getWriteToken,
  json,
  notFound,
  resolveOrg,
  toDate,
  toTags,
  unauthorized,
} from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIORITIES = new Set(["urgent", "high", "normal", "low"]);

/** GET /api/v1/tasks/:id?orgId= — detalhe compacto da tarefa (sem capa/data URL). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const orgId = await resolveOrg(t.userId, new URL(req.url).searchParams.get("orgId"));
  if (!orgId) return forbidden();

  const task = await getTaskCard(orgId, id);
  if (!task) return notFound();
  return json({
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
      startDate: task.startDate ? task.startDate.toISOString().slice(0, 10) : null,
      completed: task.completed,
      client: task.client?.name ?? null,
      assignees: task.assignees.map((a) => ({ id: a.id, name: a.name })),
      tags: task.tags.map((tg) => tg.label),
      commentCount: task.commentCount,
      subtasks: { total: task.subtaskTotal, done: task.subtaskDone },
    },
  });
}

/** PATCH /api/v1/tasks/:id — atualiza campos da tarefa (parcial). Escrita. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const orgId = await resolveOrg(t.userId, body.orgId);
  if (!orgId) return forbidden();

  const existing = await getTaskCard(orgId, id);
  if (!existing) return notFound();
  if (!existing.statusId) return json({ error: "tarefa sem status" }, 400);

  await updateTask(orgId, {
    id,
    statusId: body.statusId ?? existing.statusId,
    title: body.title ?? existing.title,
    description: body.description !== undefined ? body.description : existing.description,
    cover: existing.cover,
    priority: PRIORITIES.has(body.priority) ? body.priority : existing.priority,
    clientId: body.clientId !== undefined ? body.clientId : existing.client?.id ?? null,
    startDate: existing.startDate,
    dueDate: body.dueDate !== undefined ? toDate(body.dueDate) : existing.dueDate,
    estimateMinutes: existing.estimateMinutes,
    recurrence: existing.recurrence,
    assigneeIds: Array.isArray(body.assigneeIds)
      ? body.assigneeIds
      : existing.assignees.map((a) => a.id),
    tags: body.tags !== undefined ? toTags(body.tags) : existing.tags,
  });

  const changed = Object.keys(body).filter((k) =>
    ["title", "description", "priority", "statusId", "dueDate", "assigneeIds", "tags", "clientId"].includes(k),
  );
  await logActivity(orgId, id, t.userId, aiActor(t), "updated", changed.join(", ") || null);
  return json({ ok: true });
}

/** DELETE /api/v1/tasks/:id?confirm=true — exclui (soft) a tarefa. Escrita + confirmação. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const url = new URL(req.url);
  if (url.searchParams.get("confirm") !== "true") {
    return json({ error: "confirmação obrigatória: passe ?confirm=true" }, 400);
  }
  const orgId = await resolveOrg(t.userId, url.searchParams.get("orgId"));
  if (!orgId) return forbidden();

  const existing = await getTaskCard(orgId, id);
  if (!existing) return notFound();
  await logActivity(orgId, id, t.userId, aiActor(t), "deleted", existing.title);
  await deleteTask(orgId, id);
  return json({ ok: true });
}
