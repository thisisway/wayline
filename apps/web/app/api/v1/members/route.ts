import { mcpSearchMembers } from "@wayline/db";
import { forbidden, getToken, json, resolveOrg, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/members?orgId=&q= — membros da org (para achar responsáveis). */
export async function GET(req: Request) {
  const t = await getToken(req);
  if (!t) return unauthorized();
  const url = new URL(req.url);
  const orgId = await resolveOrg(t.userId, url.searchParams.get("orgId"));
  if (!orgId) return forbidden();

  const members = await mcpSearchMembers(orgId, url.searchParams.get("q") ?? "");
  return json({ members });
}
