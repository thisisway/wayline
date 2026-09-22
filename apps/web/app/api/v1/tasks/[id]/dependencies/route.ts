import { addDependency, getTaskDependencies, logActivity } from "@wayline/db";
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

const compact = (d: { depId: string; taskId: string; title: string; completed: boolean }) => ({
  depId: d.depId,
  taskId: d.taskId,
  title: d.title,
  completed: d.completed,
});

/** GET /api/v1/tasks/:id/dependencies — o que bloqueia esta tarefa e o que ela bloqueia. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const orgId = await resolveOrg(t.userId, new URL(req.url).searchParams.get("orgId"));
  if (!orgId) return forbidden();
  const deps = await getTaskDependencies(orgId, id);
  return json({ blockedBy: deps.blockedBy.map(compact), blocks: deps.blocks.map(compact) });
}

/** POST /api/v1/tasks/:id/dependencies — esta tarefa passa a depender de dependsOnId. Escrita. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const orgId = await resolveOrg(t.userId, body.orgId);
  if (!orgId) return forbidden();
  if (!body.dependsOnId) return json({ error: "dependsOnId é obrigatório" }, 400);

  // dependsOnId (blocker) bloqueia esta tarefa (blocked).
  const res = await addDependency(orgId, body.dependsOnId, id);
  if (!res.ok) return json({ error: res.error }, 400);
  await logActivity(orgId, id, t.userId, aiActor(t), "dependency", `depende de ${res.dep.title}`);
  return json({ ok: true, depId: res.dep.depId });
}
