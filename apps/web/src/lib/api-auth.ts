import "server-only";
import { getUserOrgs, resolveApiToken, type ResolvedToken } from "@wayline/db";

/** Resolve o Bearer token (PAT) do header → usuário/escopo, ou null. */
export async function getToken(req: Request): Promise<ResolvedToken | null> {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  return resolveApiToken((m[1] ?? "").trim());
}

/** Org do request: a pedida (se o usuário for membro) ou a primeira do usuário. */
export async function resolveOrg(
  userId: string,
  requested?: string | null,
): Promise<string | null> {
  const orgs = await getUserOrgs(userId);
  if (requested) return orgs.some((o) => o.id === requested) ? requested : null;
  return orgs[0]?.id ?? null;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const unauthorized = () => json({ error: "unauthorized" }, 401);
export const forbidden = () => json({ error: "forbidden" }, 403);
export const notFound = () => json({ error: "not_found" }, 404);
