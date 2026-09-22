import { renameSubtask, setSubtaskDone } from "@wayline/db";
import { forbidden, getWriteToken, json, resolveOrg, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PATCH /api/v1/subtasks/:id — marca concluída e/ou renomeia. Escrita. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getWriteToken(req);
  if (!t) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const orgId = await resolveOrg(t.userId, body.orgId);
  if (!orgId) return forbidden();

  if (typeof body.done === "boolean") await setSubtaskDone(orgId, id, body.done);
  if (typeof body.title === "string" && body.title.trim()) {
    await renameSubtask(orgId, id, body.title.slice(0, 300));
  }
  return json({ ok: true });
}
