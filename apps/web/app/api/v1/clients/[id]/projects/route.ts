import { mcpProjectsByClient } from "@wayline/db";
import { forbidden, getToken, json, resolveOrg, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/clients/:id/projects?orgId= — projetos (listas) do cliente. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const orgId = await resolveOrg(t.userId, new URL(req.url).searchParams.get("orgId"));
  if (!orgId) return forbidden();

  const projects = await mcpProjectsByClient(orgId, id);
  return json({ projects: projects.map((p) => ({ id: p.id, name: p.name })) });
}
