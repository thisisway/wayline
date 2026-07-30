import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, withOrg } from "../client";
import { lists, projectTemplates, statuses, tasks } from "../schema";
import type { TemplateSeed } from "./orgs";

export interface OrgTemplateItem {
  id: string;
  name: string;
  description: string;
  columns: number;
  tasks: number;
}

function normKind(k: string): "open" | "active" | "done" {
  return k === "done" ? "done" : k === "open" ? "open" : "active";
}

/** Captura a estrutura de uma lista (colunas + tarefas de topo) como template. */
export async function saveListAsTemplate(
  orgId: string,
  listId: string,
  name: string,
  description: string,
  createdBy: string | null,
): Promise<string | null> {
  const seed = await withOrg(orgId, async (tx): Promise<TemplateSeed | null> => {
    const list = await tx.query.lists.findFirst({
      where: and(eq(lists.id, listId), eq(lists.orgId, orgId), isNull(lists.deletedAt)),
    });
    if (!list) return null;
    const cols = await tx.query.statuses.findMany({
      where: eq(statuses.listId, listId),
      orderBy: [asc(statuses.position)],
    });
    const idx = new Map(cols.map((c, i) => [c.id, i]));
    const ts = await tx.query.tasks.findMany({
      where: and(eq(tasks.listId, listId), isNull(tasks.deletedAt), isNull(tasks.parentId)),
      orderBy: [asc(tasks.position)],
      limit: 200,
    });
    return {
      listName: list.name,
      columns: cols.map((c) => ({ name: c.name, kind: normKind(c.kind), color: c.color })),
      tasks: ts
        .filter((t) => t.statusId && idx.has(t.statusId))
        .map((t) => ({ title: t.title, col: idx.get(t.statusId!)!, description: t.description ?? undefined })),
    };
  });
  if (!seed) return null;
  const db = getDb();
  const [row] = await db
    .insert(projectTemplates)
    .values({ orgId, createdBy, name: name.trim() || seed.listName, description: description.trim(), seed })
    .returning({ id: projectTemplates.id });
  return row?.id ?? null;
}

/** Templates salvos da org (resiliente). */
export async function listOrgTemplates(orgId: string): Promise<OrgTemplateItem[]> {
  try {
    const db = getDb();
    const rows = await db.query.projectTemplates.findMany({
      where: and(eq(projectTemplates.orgId, orgId), isNull(projectTemplates.deletedAt)),
      orderBy: [asc(projectTemplates.createdAt)],
    });
    return rows.map((r) => {
      const seed = (r.seed ?? {}) as Partial<TemplateSeed>;
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        columns: seed.columns?.length ?? 0,
        tasks: seed.tasks?.length ?? 0,
      };
    });
  } catch {
    return [];
  }
}

/** Seed de um template salvo (para criar o projeto). */
export async function getOrgTemplateSeed(orgId: string, id: string): Promise<TemplateSeed | null> {
  try {
    const db = getDb();
    const row = await db.query.projectTemplates.findFirst({
      where: and(eq(projectTemplates.id, id), eq(projectTemplates.orgId, orgId), isNull(projectTemplates.deletedAt)),
    });
    return row ? ((row.seed ?? null) as TemplateSeed | null) : null;
  } catch {
    return null;
  }
}

export async function deleteOrgTemplate(orgId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .update(projectTemplates)
    .set({ deletedAt: new Date() })
    .where(and(eq(projectTemplates.id, id), eq(projectTemplates.orgId, orgId)));
}
