import { mcpSearchProjects } from "@wayline/db";
import { forbidden, getToken, json, resolveOrg, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/projects?q=&orgId=&limit= — busca de projetos (listas). */
export async function GET(req: Request) {
  const t = await getToken(req);
  if (!t) return unauthorized();
  const url = new URL(req.url);
  const orgId = await resolveOrg(t.userId, url.searchParams.get("orgId"));
  if (!orgId) return forbidden();

  const q = url.searchParams.get("q") ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);
  const projects = await mcpSearchProjects(orgId, q, limit);
  return json({
    orgId,
    projects: projects.map((p) => ({ id: p.id, name: p.name, client: p.clientName })),
  });
}
