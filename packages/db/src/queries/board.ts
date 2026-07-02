import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, withOrg } from "../client";
import { clients, lists, organizations, statuses, tasks } from "../schema";

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

  // organizations não tem org_id (raiz do tenant) → leitura fora do escopo RLS.
  const org = await db.query.organizations.findFirst({
    where: isNull(organizations.deletedAt),
    orderBy: [asc(organizations.createdAt)],
  });
  if (!org) return null;

  // A partir daqui tudo roda com app.current_org setado (RLS ativa).
  return withOrg(org.id, async (tx) => {
    const list =
      (await tx.query.lists.findFirst({
        where: and(eq(lists.name, "Launch Campaign"), isNull(lists.deletedAt)),
      })) ??
      (await tx.query.lists.findFirst({
        where: isNull(lists.deletedAt),
        orderBy: [asc(lists.createdAt)],
      }));
    if (!list) return null;

    // Sequencial: uma única conexão na transação.
    const cols = await tx.query.statuses.findMany({
      where: eq(statuses.listId, list.id),
      orderBy: [asc(statuses.position)],
    });
    const rows = await tx.query.tasks.findMany({
      where: and(eq(tasks.listId, list.id), isNull(tasks.deletedAt)),
      orderBy: [asc(tasks.position)],
      with: { client: true, assignees: { with: { user: true } } },
    });
    const clientRows = await tx.query.clients.findMany({
      where: isNull(clients.deletedAt),
      orderBy: [asc(clients.name)],
    });
    const memberRows = await tx.query.memberships.findMany({ with: { user: true } });

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
  });
}

/** Card único (após create/update) para reconciliar o estado local do board. */
export async function getTaskCard(orgId: string, id: string): Promise<BoardTaskDTO | null> {
  return withOrg(orgId, async (tx) => {
    const t = await tx.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: { client: true, assignees: { with: { user: true } } },
    });
    return t ? toDTO(t) : null;
  });
}
