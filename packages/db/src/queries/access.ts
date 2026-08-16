import { and, asc, eq, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { accessEntries } from "../schema";

export interface AccessEntryDTO {
  id: string;
  name: string;
  url: string;
  login: string;
  secret: string;
  status: string;
  note: string;
}

export interface AccessEntryInput {
  name?: string;
  url?: string;
  login?: string;
  secret?: string;
  status?: string;
  note?: string;
}

function toDTO(r: typeof accessEntries.$inferSelect): AccessEntryDTO {
  return {
    id: r.id,
    name: r.name,
    url: r.url,
    login: r.login,
    secret: r.secret,
    status: r.status,
    note: r.note,
  };
}

export async function listAccessEntries(orgId: string, spaceId: string): Promise<AccessEntryDTO[]> {
  try {
    return await withOrg(orgId, async (tx) => {
      const rows = await tx.query.accessEntries.findMany({
        where: and(eq(accessEntries.spaceId, spaceId), isNull(accessEntries.deletedAt)),
        orderBy: [asc(accessEntries.position), asc(accessEntries.createdAt)],
      });
      return rows.map(toDTO);
    });
  } catch {
    return [];
  }
}

/** Spaces (da org) que têm ao menos um acesso — para exibir o nó na árvore. */
export async function spacesWithAccess(orgId: string): Promise<Set<string>> {
  try {
    return await withOrg(orgId, async (tx) => {
      const rows = await tx.query.accessEntries.findMany({
        columns: { spaceId: true },
        where: isNull(accessEntries.deletedAt),
      });
      return new Set(rows.map((r) => r.spaceId));
    });
  } catch {
    return new Set();
  }
}

export async function createAccessEntry(
  orgId: string,
  spaceId: string,
  input: AccessEntryInput,
): Promise<AccessEntryDTO | null> {
  return withOrg(orgId, async (tx) => {
    const [row] = await tx
      .insert(accessEntries)
      .values({
        orgId,
        spaceId,
        name: input.name?.trim() || "Acesso",
        url: input.url ?? "",
        login: input.login ?? "",
        secret: input.secret ?? "",
        status: input.status === "inactive" ? "inactive" : "active",
        note: input.note ?? "",
      })
      .returning();
    return row ? toDTO(row) : null;
  });
}

export async function updateAccessEntry(
  orgId: string,
  id: string,
  input: AccessEntryInput,
): Promise<void> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) set.name = input.name.trim() || "Acesso";
  if (input.url !== undefined) set.url = input.url;
  if (input.login !== undefined) set.login = input.login;
  if (input.secret !== undefined) set.secret = input.secret;
  if (input.status !== undefined) set.status = input.status === "inactive" ? "inactive" : "active";
  if (input.note !== undefined) set.note = input.note;
  await withOrg(orgId, async (tx) => {
    await tx.update(accessEntries).set(set).where(eq(accessEntries.id, id));
  });
}

export async function deleteAccessEntry(orgId: string, id: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.update(accessEntries).set({ deletedAt: new Date() }).where(eq(accessEntries.id, id));
  });
}
