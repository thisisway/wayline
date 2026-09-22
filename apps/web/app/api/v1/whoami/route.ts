import { getUserOrgs } from "@wayline/db";
import { getToken, json, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const t = await getToken(req);
  if (!t) return unauthorized();
  const orgs = await getUserOrgs(t.userId);
  return json({
    user: { id: t.userId, token: t.name, scope: t.scope },
    orgs: orgs.map((o) => ({ id: o.id, name: o.name })),
  });
}
