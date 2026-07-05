import { and, asc, eq, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { clients } from "../schema";

export interface ClientDTO {
  id: string;
  name: string;
  color: string;
  contactEmail: string | null;
  hourBudget: number | null;
}

export interface CreateClientInput {
  name: string;
  color: string;
  contactEmail?: string | null;
  hourBudget?: number | null;
}

export async function listClients(orgId: string): Promise<ClientDTO[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.clients.findMany({
      where: isNull(clients.deletedAt),
      orderBy: [asc(clients.name)],
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      contactEmail: c.contactEmail,
      hourBudget: c.hourBudget,
    }));
  });
}

export async function createClient(orgId: string, input: CreateClientInput): Promise<ClientDTO> {
  return withOrg(orgId, async (tx) => {
    const [row] = await tx
      .insert(clients)
      .values({
        orgId,
        name: input.name.trim(),
        color: input.color,
        contactEmail: input.contactEmail?.trim() || null,
        hourBudget: input.hourBudget ?? null,
      })
      .returning();
    if (!row) throw new Error("falha ao criar cliente");
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      contactEmail: row.contactEmail,
      hourBudget: row.hourBudget,
    };
  });
}

export async function updateClient(
  orgId: string,
  id: string,
  patch: { name?: string; color?: string; contactEmail?: string | null; hourBudget?: number | null },
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    const set: Partial<typeof clients.$inferInsert> = { updatedAt: new Date() };
    if (patch.name !== undefined) set.name = patch.name.trim();
    if (patch.color !== undefined) set.color = patch.color;
    if (patch.contactEmail !== undefined) set.contactEmail = patch.contactEmail?.trim() || null;
    if (patch.hourBudget !== undefined) set.hourBudget = patch.hourBudget;
    await tx.update(clients).set(set).where(eq(clients.id, id));
  });
}

/** Arquiva (soft delete). As tarefas mantêm o vínculo, mas o cliente some das listas. */
export async function archiveClient(orgId: string, id: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .update(clients)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(clients.id, id), isNull(clients.deletedAt)));
  });
}
