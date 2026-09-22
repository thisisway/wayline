import { removeDependency } from "@wayline/db";
import { forbidden, getWriteToken, json, resolveOrg, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** DELETE /api/v1/dependencies/:depId?orgId= — remove uma dependência. Escrita. */
export async function DELETE(req: Request, { params }: { params: Promise<{ depId: string }> }) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const { depId } = await params;
  const orgId = await resolveOrg(t.userId, new URL(req.url).searchParams.get("orgId"));
  if (!orgId) return forbidden();
  await removeDependency(orgId, depId);
  return json({ ok: true });
}
