import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "../client";
import { lists, organizations, statuses, tasks } from "../schema";

/**
 * Query do Board (Fase 1.1).
 *
 * Traduz statuses (colunas) + tasks (agrupadas por status) numa estrutura
 * pronta para os renderizadores. Sem filtros/sort custom ainda — isso vira a
 * "engine de views" numa etapa seguinte. Ainda sem RLS: pega a primeira org.
 */

export interface BoardTaskDTO {
  id: string;
  title: string;
  priority: "urgent" | "high" | "normal" | "low";
  dueDate: Date | null;
  completed: boolean;
  client: { id: string; name: string; color: string } | null;
  assignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
  tags: Array<{ label: string; color: string }>;
}

export interface BoardColumnDTO {
  id: string;
  name: string;
  kind: "open" | "active" | "done";
  color: string;
  tasks: BoardTaskDTO[];
}

export interface BoardData {
  listId: string;
  listName: string;
  columns: BoardColumnDTO[];
}

/** Board da lista "Launch Campaign" (ou a primeira lista da primeira org). */
export async function getDefaultBoard(): Promise<BoardData | null> {
  const db = getDb();

  const org = await db.query.organizations.findFirst({
    where: isNull(organizations.deletedAt),
    orderBy: [asc(organizations.createdAt)],
  });
  if (!org) return null;

  const list =
    (await db.query.lists.findFirst({
      where: and(eq(lists.orgId, org.id), eq(lists.name, "Launch Campaign"), isNull(lists.deletedAt)),
    })) ??
    (await db.query.lists.findFirst({
      where: and(eq(lists.orgId, org.id), isNull(lists.deletedAt)),
      orderBy: [asc(lists.createdAt)],
    }));
  if (!list) return null;

  const cols = await db.query.statuses.findMany({
    where: eq(statuses.listId, list.id),
    orderBy: [asc(statuses.position)],
  });

  const rows = await db.query.tasks.findMany({
    where: and(eq(tasks.listId, list.id), isNull(tasks.deletedAt)),
    orderBy: [asc(tasks.position)],
    with: {
      client: true,
      assignees: { with: { user: true } },
    },
  });

  const byStatus = new Map<string, BoardTaskDTO[]>();
  for (const t of rows) {
    if (!t.statusId) continue;
    const dto: BoardTaskDTO = {
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
      completed: t.completed,
      client: t.client
        ? { id: t.client.id, name: t.client.name, color: t.client.color }
        : null,
      assignees: t.assignees.map((a) => ({
        id: a.user.id,
        name: a.user.name,
        avatarUrl: a.user.avatarUrl,
      })),
      tags: t.tags,
    };
    const bucket = byStatus.get(t.statusId);
    if (bucket) bucket.push(dto);
    else byStatus.set(t.statusId, [dto]);
  }

  const columns: BoardColumnDTO[] = cols.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    color: c.color,
    tasks: byStatus.get(c.id) ?? [],
  }));

  return { listId: list.id, listName: list.name, columns };
}
