import { bulkSetPriority, logActivity } from "@wayline/db";
import { aiActor, forbidden, getWriteToken, json, resolveOrg, unauthorized } from "@/lib/api-auth";
import { pokeList } from "@/actions/live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIORITIES = new Set(["urgent", "high", "normal", "low"]);

/** POST /api/v1/tasks/bulk-priority — define a prioridade de várias tarefas. Escrita. */
export async function POST(req: Request) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const orgId = await resolveOrg(t.userId, body.orgId);
  if (!orgId) return forbidden();
  const ids: string[] = Array.isArray(body.taskIds) ? body.taskIds : [];
  if (ids.length === 0 || !PRIORITIES.has(body.priority)) {
    return json({ error: "taskIds[] e priority (urgent|high|normal|low) são obrigatórios" }, 400);
  }

  await bulkSetPriority(orgId, ids, body.priority);
  for (const id of ids) await logActivity(orgId, id, t.userId, aiActor(t), "priority", "lote");
  if (body.projectId) await pokeList(body.projectId);
  return json({ updated: ids.length });
}
