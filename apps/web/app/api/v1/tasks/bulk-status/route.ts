import { bulkSetStatus, logActivity } from "@wayline/db";
import { aiActor, forbidden, getWriteToken, json, resolveOrg, unauthorized } from "@/lib/api-auth";
import { pokeList } from "@/actions/live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/v1/tasks/bulk-status — move várias tarefas para um status. Escrita. */
export async function POST(req: Request) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const orgId = await resolveOrg(t.userId, body.orgId);
  if (!orgId) return forbidden();
  const ids: string[] = Array.isArray(body.taskIds) ? body.taskIds : [];
  if (ids.length === 0 || !body.statusId) {
    return json({ error: "taskIds[] e statusId são obrigatórios" }, 400);
  }

  await bulkSetStatus(orgId, ids, body.statusId);
  for (const id of ids) await logActivity(orgId, id, t.userId, aiActor(t), "status", "lote");
  if (body.projectId) await pokeList(body.projectId);
  return json({ updated: ids.length });
}
