import { getTaskCard } from "@wayline/db";
import { forbidden, getToken, json, notFound, resolveOrg, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
