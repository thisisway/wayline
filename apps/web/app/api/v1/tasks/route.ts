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

/** POST /api/v1/tasks — cria uma tarefa num projeto. Requer escopo de escrita. */
export async function POST(req: Request) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const orgId = await resolveOrg(t.userId, body.orgId);
  if (!orgId) return forbidden();
  if (!body.projectId || !body.title?.trim()) {
    return json({ error: "projectId e title são obrigatórios" }, 400);
  }

  const project = await mcpProjectSummary(orgId, body.projectId);
  if (!project) return json({ error: "projeto não encontrado" }, 404);
  const statusId =
    body.statusId && project.statuses.some((s) => s.id === body.statusId)
      ? body.statusId
      : project.statuses[0]?.id;
  if (!statusId) return json({ error: "projeto sem colunas de status" }, 400);

  const id = await createTask(orgId, {
    statusId,
    title: String(body.title).slice(0, 300),
    description: body.description ?? null,
    priority: PRIORITIES.has(body.priority) ? body.priority : "normal",
    clientId: body.clientId ?? project.clientId ?? null,
    startDate: toDate(body.startDate),
    dueDate: toDate(body.dueDate),
    estimateMinutes: null,
    recurrence: null,
    assigneeIds: Array.isArray(body.assigneeIds) ? body.assigneeIds : [],
    tags: toTags(body.tags),
  });

  await logCreated(orgId, id, t.userId, aiActor(t));
  await pokeList(body.projectId);
  return json({ id, statusId });
}
