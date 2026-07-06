import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb, withOrg } from "../client";
import { boardShares } from "../schema";

export interface ShareLookup {
  orgId: string;
  listId: string;
}

/** Share ativo de uma lista (não revogado), se houver. */
export async function getActiveShare(orgId: string, listId: string): Promise<string | null> {
  return withOrg(orgId, async (tx) => {
    const row = await tx.query.boardShares.findFirst({
      where: and(
        eq(boardShares.listId, listId),
        eq(boardShares.orgId, orgId),
        eq(boardShares.revoked, false),
      ),
    });
    return row?.token ?? null;
  });
}

/** Retorna o token ativo da lista, criando um se necessário. */
export async function getOrCreateShare(
  orgId: string,
  listId: string,
  createdBy: string | null,
): Promise<string> {
  return withOrg(orgId, async (tx) => {
    const existing = await tx.query.boardShares.findFirst({
      where: and(
        eq(boardShares.listId, listId),
        eq(boardShares.orgId, orgId),
        eq(boardShares.revoked, false),
      ),
    });
    if (existing) return existing.token;
    const token = randomBytes(18).toString("base64url");
    const [row] = await tx
      .insert(boardShares)
      .values({ orgId, listId, token, createdBy })
      .returning({ token: boardShares.token });
    if (!row) throw new Error("falha ao criar link");
    return row.token;
  });
}

export async function revokeShares(orgId: string, listId: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .update(boardShares)
      .set({ revoked: true })
      .where(and(eq(boardShares.listId, listId), eq(boardShares.orgId, orgId)));
  });
}

/** Resolve um token público → org + lista (sem RLS; token é o segredo). */
export async function getShareByToken(token: string): Promise<ShareLookup | null> {
  const db = getDb();
  const row = await db.query.boardShares.findFirst({
    where: and(eq(boardShares.token, token), eq(boardShares.revoked, false)),
  });
  return row ? { orgId: row.orgId, listId: row.listId } : null;
}
