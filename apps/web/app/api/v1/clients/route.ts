import { listClients } from "@wayline/db";
import { forbidden, getToken, json, resolveOrg, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/clients?q=&orgId=&limit= — busca compacta de clientes. */
export async function GET(req: Request) {
  const t = await getToken(req);
  if (!t) return unauthorized();
  const url = new URL(req.url);
  const orgId = await resolveOrg(t.userId, url.searchParams.get("orgId"));
  if (!orgId) return forbidden();

  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);
  const all = await listClients(orgId);
  const clients = all
    .filter((c) => !q || c.name.toLowerCase().includes(q))
    .slice(0, limit)
    .map((c) => ({ id: c.id, name: c.name }));
  return json({ orgId, clients });
}
