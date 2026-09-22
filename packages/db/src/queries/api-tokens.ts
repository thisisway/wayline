import { and, desc, eq, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "../client";
import { apiTokens } from "../schema";

export type ApiScope = "read" | "write";

export interface ApiTokenDTO {
  id: string;
  name: string;
  scope: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export interface ResolvedToken {
  id: string;
  userId: string;
  name: string;
  scope: ApiScope;
}

function hash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Cria um PAT e devolve o valor CRU uma única vez (não é recuperável depois). */
export async function createApiToken(
  userId: string,
  name: string,
  scope: ApiScope,
): Promise<{ id: string; token: string } | null> {
  const db = getDb();
  const raw = "wl_" + randomBytes(32).toString("base64url");
  const [row] = await db
    .insert(apiTokens)
    .values({
      userId,
      name: name.trim().slice(0, 80) || "Token",
      tokenHash: hash(raw),
      scope: scope === "read" ? "read" : "write",
    })
    .returning({ id: apiTokens.id });
  return row ? { id: row.id, token: raw } : null;
}

/** Lista os tokens do usuário (sem o hash). */
export async function listApiTokens(userId: string): Promise<ApiTokenDTO[]> {
  const db = getDb();
  const rows = await db.query.apiTokens.findMany({
    where: and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)),
    orderBy: [desc(apiTokens.createdAt)],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    scope: r.scope,
    lastUsedAt: r.lastUsedAt,
    createdAt: r.createdAt,
  }));
}

/** Revoga (soft) um token do usuário. */
export async function revokeApiToken(userId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId)));
}

/** Resolve um token cru → usuário/escopo (ou null). Marca lastUsedAt. */
export async function resolveApiToken(raw: string): Promise<ResolvedToken | null> {
  if (!raw || !raw.startsWith("wl_")) return null;
  const db = getDb();
  const row = await db.query.apiTokens.findFirst({
    where: and(eq(apiTokens.tokenHash, hash(raw)), isNull(apiTokens.revokedAt)),
  });
  if (!row) return null;
  // Marca uso (best-effort; não bloqueia a chamada).
  void db
    .update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, row.id))
    .catch(() => {});
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    scope: row.scope === "read" ? "read" : "write",
  };
}
