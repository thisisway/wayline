import { mcpProjectTasks } from "@wayline/db";
import { forbidden, getToken, json, resolveOrg, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/projects/:id/tasks?orgId=&statusId=&assigneeId=&priority=&limit=&offset= */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const url = new URL(req.url);
  const orgId = await resolveOrg(t.userId, url.searchParams.get("orgId"));
  if (!orgId) return forbidden();

  const tasks = await mcpProjectTasks(orgId, id, {
    statusId: url.searchParams.get("statusId") ?? undefined,
    assigneeId: url.searchParams.get("assigneeId") ?? undefined,
    priority: url.searchParams.get("priority") ?? undefined,
    limit: Number(url.searchParams.get("limit")) || undefined,
    offset: Number(url.searchParams.get("offset")) || undefined,
  });
  return json({ tasks });
}
