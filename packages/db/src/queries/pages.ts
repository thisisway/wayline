import { and, asc, eq, isNull, or } from "drizzle-orm";
import { withOrg, type Tx } from "../client";
import { pages } from "../schema";

/** Item da árvore de páginas (sem conteúdo — leve para a sidebar). */
export interface PageNode {
  id: string;
  parentId: string | null;
  ownerId: string | null;
  title: string;
  icon: string | null;
  personal: boolean;
  updatedAt: Date;
}

/** Página completa (com conteúdo) para o editor. */
export interface PageDoc {
  id: string;
  parentId: string | null;
  ownerId: string | null;
  title: string;
  content: string;
  icon: string | null;
  personal: boolean;
  updatedAt: Date;
}

function toNode(row: typeof pages.$inferSelect): PageNode {
  return {
    id: row.id,
    parentId: row.parentId,
    ownerId: row.ownerId,
    title: row.title,
    icon: row.icon,
    personal: row.ownerId != null,
    updatedAt: row.updatedAt,
  };
}

/**
 * Árvore de páginas visíveis ao usuário: documentos do workspace (owner nulo) +
 * as notas pessoais dele (owner = userId). Notas de outros ficam ocultas.
 */
export async function listPages(orgId: string, userId: string): Promise<PageNode[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.pages.findMany({
      where: and(
        isNull(pages.deletedAt),
        or(isNull(pages.ownerId), eq(pages.ownerId, userId)),
      ),
      orderBy: [asc(pages.position), asc(pages.createdAt)],
    });
    return rows.map(toNode);
  });
}

export async function getPage(
  orgId: string,
  userId: string,
  pageId: string,
): Promise<PageDoc | null> {
  return withOrg(orgId, async (tx) => {
    const row = await tx.query.pages.findFirst({
      where: and(eq(pages.id, pageId), isNull(pages.deletedAt)),
    });
    if (!row) return null;
    // Nota pessoal de outro usuário: não pode ser lida.
    if (row.ownerId != null && row.ownerId !== userId) return null;
    return {
      id: row.id,
      parentId: row.parentId,
      ownerId: row.ownerId,
      title: row.title,
      content: row.content,
      icon: row.icon,
      personal: row.ownerId != null,
      updatedAt: row.updatedAt,
    };
  });
}

/**
 * Cria uma página. `personal` → nota pessoal (owner = userId). `parentId` a
 * aninha como subpágina (wiki). Retorna o nó criado.
 */
export async function createPage(
  orgId: string,
  userId: string,
  opts: { parentId?: string | null; personal?: boolean; title?: string },
): Promise<PageNode> {
  return withOrg(orgId, async (tx) => {
    const [row] = await tx
      .insert(pages)
      .values({
        orgId,
        parentId: opts.parentId ?? null,
        ownerId: opts.personal ? userId : null,
        title: opts.title?.trim() || "Sem título",
      })
      .returning();
    return toNode(row!);
  });
}

/** Garante que a página pertence ao escopo do usuário antes de mutar. */
async function ownsScope(tx: Tx, pageId: string, userId: string) {
  const row = await tx.query.pages.findFirst({
    where: and(eq(pages.id, pageId), isNull(pages.deletedAt)),
  });
  if (!row) return null;
  if (row.ownerId != null && row.ownerId !== userId) return null; // nota de outro
  return row;
}

export async function renamePage(
  orgId: string,
  userId: string,
  pageId: string,
  title: string,
  icon?: string | null,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    if (!(await ownsScope(tx, pageId, userId))) return;
    const set: { title: string; updatedAt: Date; icon?: string | null } = {
      title: title.trim() || "Sem título",
      updatedAt: new Date(),
    };
    if (icon !== undefined) set.icon = icon;
    await tx.update(pages).set(set).where(eq(pages.id, pageId));
  });
}

export async function savePageContent(
  orgId: string,
  userId: string,
  pageId: string,
  content: string,
): Promise<Date | null> {
  return withOrg(orgId, async (tx) => {
    if (!(await ownsScope(tx, pageId, userId))) return null;
    const now = new Date();
    await tx.update(pages).set({ content, updatedAt: now }).where(eq(pages.id, pageId));
    return now;
  });
}

/** Reparenta uma página (arrastar na árvore). `null` = raiz. */
export async function movePage(
  orgId: string,
  userId: string,
  pageId: string,
  parentId: string | null,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    if (pageId === parentId) return;
    if (!(await ownsScope(tx, pageId, userId))) return;
    await tx.update(pages).set({ parentId, updatedAt: new Date() }).where(eq(pages.id, pageId));
  });
}

/** Exclui uma página e todas as subpáginas (soft delete recursivo). */
export async function deletePage(orgId: string, userId: string, pageId: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    if (!(await ownsScope(tx, pageId, userId))) return;
    const all = await tx.query.pages.findMany({ where: isNull(pages.deletedAt) });
    const byParent = new Map<string | null, string[]>();
    for (const p of all) {
      const arr = byParent.get(p.parentId) ?? [];
      arr.push(p.id);
      byParent.set(p.parentId, arr);
    }
    const toDelete: string[] = [];
    const stack = [pageId];
    while (stack.length) {
      const id = stack.pop()!;
      toDelete.push(id);
      for (const child of byParent.get(id) ?? []) stack.push(child);
    }
    const now = new Date();
    for (const id of toDelete) {
      await tx.update(pages).set({ deletedAt: now }).where(eq(pages.id, id));
    }
  });
}
