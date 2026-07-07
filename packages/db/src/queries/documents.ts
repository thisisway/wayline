import { eq } from "drizzle-orm";
import { withOrg } from "../client";
import { documents } from "../schema";

export interface DocDTO {
  title: string;
  content: string;
  updatedAt: Date;
}

export async function getListDoc(orgId: string, listId: string): Promise<DocDTO | null> {
  return withOrg(orgId, async (tx) => {
    const row = await tx.query.documents.findFirst({ where: eq(documents.listId, listId) });
    return row ? { title: row.title, content: row.content, updatedAt: row.updatedAt } : null;
  });
}

export async function upsertListDoc(
  orgId: string,
  listId: string,
  title: string,
  content: string,
): Promise<DocDTO> {
  return withOrg(orgId, async (tx) => {
    const [row] = await tx
      .insert(documents)
      .values({ orgId, listId, title: title.trim() || "Brief", content })
      .onConflictDoUpdate({
        target: documents.listId,
        set: { title: title.trim() || "Brief", content, updatedAt: new Date() },
      })
      .returning();
    if (!row) throw new Error("falha ao salvar documento");
    return { title: row.title, content: row.content, updatedAt: row.updatedAt };
  });
}
