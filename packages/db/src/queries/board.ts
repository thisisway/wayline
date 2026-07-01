import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "../client";
import { clients, lists, memberships, organizations, statuses, tasks } from "../schema";

/**
 * Query do Board (Fase 1.x).
 *
 * Traduz statuses (colunas) + tasks (agrupadas por status) numa estrutura
 * pronta para os renderizadores, junto com metadados do workspace (clientes e
 * membros) usados pelos formulários. Ainda sem RLS: pega a primeira org.
 */

export interface BoardTaskDTO {
  id: string;
  title: string;
  statusId: string | null;
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

export interface BoardClientDTO {
  id: string;
  name: string;
  color: string;
}
export interface BoardMemberDTO {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface BoardData {
  orgId: string;
  listId: string;
  listName: string;
  columns: BoardColumnDTO[];
  clients: BoardClientDTO[];
  members: BoardMemberDTO[];
}

type TaskRow = {
  id: string;
  title: string;
  statusId: string | null;
  priority: BoardTaskDTO["priority"];
  dueDate: Date | null;
  completed: boolean;
  tags: Array<{ label: string; color: string }>;
  client: { id: string; name: string; color: string } | null;
  assignees: Array<{ user: { id: string; name: string; avatarUrl: string | null } }>;
};

function toDTO(t: TaskRow): BoardTaskDTO {
  return {
    id: t.id,
    title: t.title,
    statusId: t.statusId,
    priority: t.priority,
    dueDate: t.dueDate,
    completed: t.completed,
    client: t.client ? { id: t.client.id, name: t.client.name, color: t.client.color } : null,
    assignees: t.assignees.map((a) => ({
      id: a.user.id,
      name: a.user.name,
      avatarUrl: a.user.avatarUrl,
    })),
    tags: t.tags,
  };
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

  const [cols, rows, clientRows, memberRows] = await Promise.all([
    db.query.statuses.findMany({
      where: eq(statuses.listId, list.id),
      orderBy: [asc(statuses.position)],
    }),
    db.query.tasks.findMany({
      where: and(eq(tasks.listId, list.id), isNull(tasks.deletedAt)),
      orderBy: [asc(tasks.position)],
      with: { client: true, assignees: { with: { user: true } } },
    }),
    db.query.clients.findMany({
      where: and(eq(clients.orgId, org.id), isNull(clients.deletedAt)),
      orderBy: [asc(clients.name)],
    }),
    db.query.memberships.findMany({
      where: eq(memberships.orgId, org.id),
      with: { user: true },
    }),
  ]);

  const byStatus = new Map<string, BoardTaskDTO[]>();
  for (const t of rows) {
    if (!t.statusId) continue;
    const bucket = byStatus.get(t.statusId);
    if (bucket) bucket.push(toDTO(t));
    else byStatus.set(t.statusId, [toDTO(t)]);
  }

  const columns: BoardColumnDTO[] = cols.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    color: c.color,
    tasks: byStatus.get(c.id) ?? [],
  }));

  return {
    orgId: org.id,
    listId: list.id,
    listName: list.name,
    columns,
    clients: clientRows.map((c) => ({ id: c.id, name: c.name, color: c.color })),
    members: memberRows.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
    })),
  };
}

/** Card único (após create/update) para reconciliar o estado local do board. */
export async function getTaskCard(id: string): Promise<BoardTaskDTO | null> {
  const db = getDb();
  const t = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
    with: { client: true, assignees: { with: { user: true } } },
  });
  return t ? toDTO(t) : null;
}
