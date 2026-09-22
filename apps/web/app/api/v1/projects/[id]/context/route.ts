import { getListDoc, upsertListDoc } from "@wayline/db";
import {
  forbidden,
  getToken,
  getWriteToken,
  json,
  resolveOrg,
  unauthorized,
} from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

/** POST /api/v1/projects/:id/context — anexa uma nota ao brief do projeto. Escrita. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const orgId = await resolveOrg(t.userId, body.orgId);
  if (!orgId) return forbidden();
  if (!body.note?.trim()) return json({ error: "note é obrigatória" }, 400);

  const doc = await getListDoc(orgId, id);
  const prev = doc?.content ?? "";
  const stamp = new Date().toLocaleDateString("pt-BR");
  const addition = `<p><em>[IA · ${escapeHtml(stamp)}]</em> ${escapeHtml(String(body.note).slice(0, 4000))}</p>`;
  await upsertListDoc(orgId, id, doc?.title ?? "Brief", prev + addition);
  return json({ ok: true });
}
