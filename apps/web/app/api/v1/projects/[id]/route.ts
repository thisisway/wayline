import { mcpProjectSummary } from "@wayline/db";
import { forbidden, getToken, json, notFound, resolveOrg, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/projects/:id?orgId= — resumo do projeto (cliente, status, total). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const orgId = await resolveOrg(t.userId, new URL(req.url).searchParams.get("orgId"));
  if (!orgId) return forbidden();

  const s = await mcpProjectSummary(orgId, id);
  if (!s) return notFound();
  return json({
    project: {
      id: s.id,
      name: s.name,
      client: s.clientName,
      taskCount: s.taskCount,
      statuses: s.statuses,
    },
  });
}
