import { createTask, logCreated, mcpProjectSummary } from "@wayline/db";
import {
  aiActor,
  forbidden,
  getWriteToken,
  json,
  resolveOrg,
  toDate,
  toTags,
  unauthorized,
} from "@/lib/api-auth";
import { pokeList } from "@/actions/live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIORITIES = new Set(["urgent", "high", "normal", "low"]);

/** POST /api/v1/tasks/bulk — cria várias tarefas de uma vez num projeto. */
export async function POST(req: Request) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const orgId = await resolveOrg(t.userId, body.orgId);
  if (!orgId) return forbidden();
  if (!body.projectId || !Array.isArray(body.tasks) || body.tasks.length === 0) {
    return json({ error: "projectId e tasks[] são obrigatórios" }, 400);
  }
  if (body.tasks.length > 50) return json({ error: "máximo de 50 tarefas por lote" }, 400);

  const project = await mcpProjectSummary(orgId, body.projectId);
  if (!project) return json({ error: "projeto não encontrado" }, 404);
  const defaultStatus = project.statuses[0]?.id;
  if (!defaultStatus) return json({ error: "projeto sem colunas de status" }, 400);

  const ids: string[] = [];
  for (const raw of body.tasks) {
    if (!raw?.title?.trim()) continue;
    const statusId =
      raw.statusId && project.statuses.some((s) => s.id === raw.statusId)
        ? raw.statusId
        : body.statusId && project.statuses.some((s) => s.id === body.statusId)
          ? body.statusId
          : defaultStatus;
    const id = await createTask(orgId, {
      statusId,
      title: String(raw.title).slice(0, 300),
      description: raw.description ?? null,
      priority: PRIORITIES.has(raw.priority) ? raw.priority : "normal",
      clientId: raw.clientId ?? project.clientId ?? null,
      startDate: toDate(raw.startDate),
      dueDate: toDate(raw.dueDate),
      estimateMinutes: null,
      recurrence: null,
      assigneeIds: Array.isArray(raw.assigneeIds) ? raw.assigneeIds : [],
      tags: toTags(raw.tags),
    });
    await logCreated(orgId, id, t.userId, aiActor(t));
    ids.push(id);
  }

  await pokeList(body.projectId);
  return json({ created: ids.length, ids });
}
