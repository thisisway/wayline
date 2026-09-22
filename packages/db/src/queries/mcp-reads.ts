import { and, asc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { lists, memberships, statuses, tasks, users } from "../schema";

export interface McpProject {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
}

export interface McpProjectSummary extends McpProject {
  statuses: Array<{ id: string; name: string }>;
  taskCount: number;
}

export interface McpTaskRow {
  id: string;
  title: string;
  status: string | null;
  priority: string;
  dueDate: string | null;
  assignees: string[];
  tags: string[];
}

/** Projetos (listas) de um cliente. */
export async function mcpProjectsByClient(orgId: string, clientId: string): Promise<McpProject[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.lists.findMany({
      where: and(eq(lists.clientId, clientId), isNull(lists.deletedAt)),
      with: { client: true },
      orderBy: [asc(lists.name)],
    });
    return rows.map((l) => ({
      id: l.id,
      name: l.name,
      clientId: l.clientId,
      clientName: l.client?.name ?? null,
    }));
  });
}

/** Busca projetos (listas) por nome. */
export async function mcpSearchProjects(
  orgId: string,
  q: string,
  limit = 20,
): Promise<McpProject[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.lists.findMany({
      where: q
        ? and(isNull(lists.deletedAt), ilike(lists.name, `%${q}%`))
        : isNull(lists.deletedAt),
      with: { client: true },
      orderBy: [asc(lists.name)],
      limit,
    });
    return rows.map((l) => ({
      id: l.id,
      name: l.name,
      clientId: l.clientId,
      clientName: l.client?.name ?? null,
    }));
  });
}

/** Resumo de um projeto: cliente, colunas de status e total de tarefas. */
export async function mcpProjectSummary(
  orgId: string,
  listId: string,
): Promise<McpProjectSummary | null> {
  return withOrg(orgId, async (tx) => {
    const l = await tx.query.lists.findFirst({
      where: and(eq(lists.id, listId), isNull(lists.deletedAt)),
      with: { client: true },
    });
    if (!l) return null;
    const cols = await tx.query.statuses.findMany({
      where: eq(statuses.listId, listId),
      orderBy: [asc(statuses.position)],
    });
    const count = await tx.$count(
      tasks,
      and(eq(tasks.listId, listId), isNull(tasks.parentId), isNull(tasks.deletedAt)),
    );
    return {
      id: l.id,
      name: l.name,
      clientId: l.clientId,
      clientName: l.client?.name ?? null,
      statuses: cols.map((s) => ({ id: s.id, name: s.name })),
      taskCount: count,
    };
  });
}

/** Tarefas de um projeto (compactas, com filtros e paginação). */
export async function mcpProjectTasks(
  orgId: string,
  listId: string,
  opts: { statusId?: string; assigneeId?: string; priority?: string; limit?: number; offset?: number } = {},
): Promise<McpTaskRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  return withOrg(orgId, async (tx) => {
    const where = [eq(tasks.listId, listId), isNull(tasks.parentId), isNull(tasks.deletedAt)];
    if (opts.statusId) where.push(eq(tasks.statusId, opts.statusId));
    if (opts.priority) where.push(eq(tasks.priority, opts.priority as "urgent" | "high" | "normal" | "low"));

    const rows = await tx.query.tasks.findMany({
      where: and(...where),
      with: { status: true, assignees: { with: { user: true } } },
      orderBy: [asc(tasks.position)],
      limit,
      offset,
    });

    const filtered = opts.assigneeId
      ? rows.filter((t) => t.assignees.some((a) => a.userId === opts.assigneeId))
      : rows;

    return filtered.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status?.name ?? null,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
      assignees: t.assignees.map((a) => a.user.name),
      tags: (t.tags ?? []).map((tg) => tg.label),
    }));
  });
}

/** Busca membros por nome (para achar um responsável). */
export async function mcpSearchMembers(
  orgId: string,
  q: string,
): Promise<Array<{ id: string; name: string; email: string }>> {
  return withOrg(orgId, async (tx) => {
    const ms = await tx.query.memberships.findMany({
      where: eq(memberships.orgId, orgId),
      with: { user: true },
    });
    const out = ms
      .map((m) => ({ id: m.userId, name: m.user.name, email: m.user.email }))
      .filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()));
    return out;
  });
}

/** Nomes de usuários por id (para validar responsáveis). */
export async function mcpUsersByIds(
  orgId: string,
  ids: string[],
): Promise<Array<{ id: string; name: string }>> {
  if (ids.length === 0) return [];
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.users.findMany({ where: inArray(users.id, ids) });
    return rows.map((u) => ({ id: u.id, name: u.name }));
  });
}
