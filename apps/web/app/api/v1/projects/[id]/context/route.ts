import { getListDoc } from "@wayline/db";
import { forbidden, getToken, json, resolveOrg, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Remove tags HTML do brief (é HTML rico) para um texto compacto. */
function toText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** GET /api/v1/projects/:id/context?orgId= — brief do projeto (texto compacto). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const orgId = await resolveOrg(t.userId, new URL(req.url).searchParams.get("orgId"));
  if (!orgId) return forbidden();

  const doc = await getListDoc(orgId, id);
  const brief = doc ? toText(doc.content).slice(0, 4000) : "";
  return json({ context: { brief, hasBrief: brief.length > 0 } });
}
