import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb, withOrg, type Tx } from "../client";
import {
  attachments,
  clients,
  comments,
  customFieldDefs,
  customFieldValues,
  lists,
  organizations,
  spaces,
  statuses,
  taskDependencies,
  tasks,
  timeEntries,
} from "../schema";
import { alias } from "drizzle-orm/pg-core";

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
  description: string | null;
  statusId: string | null;
  priority: "urgent" | "high" | "normal" | "low";
  startDate: Date | null;
  dueDate: Date | null;
  completed: boolean;
  estimateMinutes: number | null;
  client: { id: string; name: string; color: string } | null;
  assignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
  tags: Array<{ label: string; color: string }>;
  commentCount: number;
  subtaskTotal: number;
  subtaskDone: number;
  attachmentCount: number;
  /** Tem ao menos um bloqueador ainda não concluído. */
  blocked: boolean;
  /** Segundos totais rastreados (controle de tempo). */
  trackedSeconds: number;
  /** Campos customizados com valor preenchido. */
  customFields: Array<{ name: string; type: string; value: string }>;
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

/** Aresta de dependência entre tarefas visíveis na lista (blocker → blocked). */
export interface DependencyEdge {
  blockerId: string;
  blockedId: string;
}

export interface BoardData {
  orgId: string;
  listId: string;
  listName: string;
  columns: BoardColumnDTO[];
  clients: BoardClientDTO[];
  members: BoardMemberDTO[];
  dependencies: DependencyEdge[];
  /** Usuário "corrente" (owner da org) enquanto não há auth — autor dos comentários. */
  currentUserId: string | null;
}

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  statusId: string | null;
  priority: BoardTaskDTO["priority"];
  startDate: Date | null;
  dueDate: Date | null;
  completed: boolean;
  estimateMinutes: number | null;
  tags: Array<{ label: string; color: string }>;
  client: { id: string; name: string; color: string } | null;
  assignees: Array<{ user: { id: string; name: string; avatarUrl: string | null } }>;
};

function toDTO(t: TaskRow): BoardTaskDTO {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    statusId: t.statusId,
    priority: t.priority,
    startDate: t.startDate,
    dueDate: t.dueDate,
    estimateMinutes: t.estimateMinutes,
    completed: t.completed,
    client: t.client ? { id: t.client.id, name: t.client.name, color: t.client.color } : null,
    assignees: t.assignees.map((a) => ({
      id: a.user.id,
      name: a.user.name,
      avatarUrl: a.user.avatarUrl,
    })),
    tags: t.tags,
    commentCount: 0,
    subtaskTotal: 0,
    subtaskDone: 0,
    attachmentCount: 0,
    blocked: false,
    trackedSeconds: 0,
    customFields: [],
  };
}

/** Monta o board da org corrente (assume app.current_org já setado no tx). */
/** Lista alvo: a preferida (se existir na org, via RLS) ou o padrão. */
async function resolveList(tx: Tx, preferredListId?: string | null) {
  if (preferredListId) {
    const l = await tx.query.lists.findFirst({
      where: and(eq(lists.id, preferredListId), isNull(lists.deletedAt)),
    });
    if (l) return l;
  }
  return (
    (await tx.query.lists.findFirst({
      where: and(eq(lists.name, "Launch Campaign"), isNull(lists.deletedAt)),
    })) ??
    (await tx.query.lists.findFirst({
      where: isNull(lists.deletedAt),
      orderBy: [asc(lists.createdAt)],
    }))
  );
}

async function buildBoard(
  tx: Tx,
  orgId: string,
  list: { id: string; name: string },
): Promise<Omit<BoardData, "currentUserId">> {
  // Sequencial: uma única conexão na transação.
  const cols = await tx.query.statuses.findMany({
    where: eq(statuses.listId, list.id),
    orderBy: [asc(statuses.position)],
  });
  const rows = await tx.query.tasks.findMany({
    // Subtarefas (parent_id) não aparecem como cards de topo.
    where: and(eq(tasks.listId, list.id), isNull(tasks.parentId), isNull(tasks.deletedAt)),
    orderBy: [asc(tasks.position)],
    with: { client: true, assignees: { with: { user: true } } },
  });
  const clientRows = await tx.query.clients.findMany({
    where: isNull(clients.deletedAt),
    orderBy: [asc(clients.name)],
  });
  const memberRows = await tx.query.memberships.findMany({ with: { user: true } });

  const taskIds = rows.map((r) => r.id);
  const countRows = taskIds.length
    ? await tx
        .select({ taskId: comments.taskId, n: count() })
        .from(comments)
        .where(and(inArray(comments.taskId, taskIds), isNull(comments.deletedAt)))
        .groupBy(comments.taskId)
    : [];
  const commentCounts = new Map(countRows.map((r) => [r.taskId, r.n]));

  const subRows = taskIds.length
    ? await tx
        .select({
          parentId: tasks.parentId,
          total: count(),
          done: sql<number>`count(*) filter (where ${tasks.completed})`.mapWith(Number),
        })
        .from(tasks)
        .where(and(inArray(tasks.parentId, taskIds), isNull(tasks.deletedAt)))
        .groupBy(tasks.parentId)
    : [];
  const subCounts = new Map(subRows.map((r) => [r.parentId, { total: r.total, done: r.done }]));

  const attRows = taskIds.length
    ? await tx
        .select({ taskId: attachments.taskId, n: count() })
        .from(attachments)
        .where(inArray(attachments.taskId, taskIds))
        .groupBy(attachments.taskId)
    : [];
  const attCounts = new Map(attRows.map((r) => [r.taskId, r.n]));

  // Tarefas bloqueadas: têm um bloqueador (blocker) ainda não concluído.
  const blocker = alias(tasks, "blocker");
  const blockedRows = taskIds.length
    ? await tx
        .selectDistinct({ blockedId: taskDependencies.blockedId })
        .from(taskDependencies)
        .innerJoin(blocker, eq(blocker.id, taskDependencies.blockerId))
        .where(
          and(
            inArray(taskDependencies.blockedId, taskIds),
            eq(blocker.completed, false),
            isNull(blocker.deletedAt),
          ),
        )
    : [];
  const blockedSet = new Set(blockedRows.map((r) => r.blockedId));

  const timeRows = taskIds.length
    ? await tx
        .select({
          taskId: timeEntries.taskId,
          seconds:
            sql<number>`coalesce(sum(extract(epoch from (coalesce(${timeEntries.endedAt}, now()) - ${timeEntries.startedAt}))), 0)`.mapWith(
              Number,
            ),
        })
        .from(timeEntries)
        .where(inArray(timeEntries.taskId, taskIds))
        .groupBy(timeEntries.taskId)
    : [];
  const timeByTask = new Map(timeRows.map((r) => [r.taskId, Math.round(r.seconds)]));

  // Arestas de dependência entre tarefas visíveis (ambos os lados na lista).
  const depEdges = taskIds.length
    ? await tx
        .select({
          blockerId: taskDependencies.blockerId,
          blockedId: taskDependencies.blockedId,
        })
        .from(taskDependencies)
        .where(
          and(
            inArray(taskDependencies.blockerId, taskIds),
            inArray(taskDependencies.blockedId, taskIds),
          ),
        )
    : [];

  // Campos customizados da lista + valores por tarefa.
  const fieldDefs = await tx.query.customFieldDefs.findMany({
    where: eq(customFieldDefs.listId, list.id),
    orderBy: [asc(customFieldDefs.position), asc(customFieldDefs.createdAt)],
  });
  const fieldById = new Map(fieldDefs.map((d) => [d.id, { name: d.name, type: d.type }]));
  const fieldValRows =
    taskIds.length && fieldDefs.length
      ? await tx
          .select({
            taskId: customFieldValues.taskId,
            fieldId: customFieldValues.fieldId,
            value: customFieldValues.value,
          })
          .from(customFieldValues)
          .where(inArray(customFieldValues.taskId, taskIds))
      : [];
  const cfByTask = new Map<string, Array<{ name: string; type: string; value: string }>>();
  for (const v of fieldValRows) {
    if (v.value == null || v.value === "") continue;
    const def = fieldById.get(v.fieldId);
    if (!def) continue;
    const arr = cfByTask.get(v.taskId) ?? [];
    arr.push({ name: def.name, type: def.type, value: v.value });
    cfByTask.set(v.taskId, arr);
  }

  const byStatus = new Map<string, BoardTaskDTO[]>();
  for (const t of rows) {
    if (!t.statusId) continue;
    const dto = toDTO(t);
    dto.commentCount = commentCounts.get(t.id) ?? 0;
    dto.attachmentCount = attCounts.get(t.id) ?? 0;
    dto.blocked = blockedSet.has(t.id);
    dto.trackedSeconds = timeByTask.get(t.id) ?? 0;
    dto.customFields = cfByTask.get(t.id) ?? [];
    const sub = subCounts.get(t.id);
    dto.subtaskTotal = sub?.total ?? 0;
    dto.subtaskDone = sub?.done ?? 0;
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

  return {
    orgId,
    listId: list.id,
    listName: list.name,
    columns,
    clients: clientRows.map((c) => ({ id: c.id, name: c.name, color: c.color })),
    members: memberRows.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
    })),
    dependencies: depEdges,
  };
}

/** Board de uma org (a da sessão) numa lista específica (ou a padrão). */
export async function getBoardForOrg(
  orgId: string,
  currentUserId: string | null,
  listId?: string | null,
): Promise<BoardData | null> {
  return withOrg(orgId, async (tx) => {
    const list = await resolveList(tx, listId);
    if (!list) return null;
    const b = await buildBoard(tx, orgId, list);
    return { ...b, currentUserId };
  });
}

/** Board da primeira org (uso em scripts/sem auth). */
export async function getDefaultBoard(): Promise<BoardData | null> {
  const db = getDb();
  const org = await db.query.organizations.findFirst({
    where: isNull(organizations.deletedAt),
    orderBy: [asc(organizations.createdAt)],
  });
  if (!org) return null;
  return withOrg(org.id, async (tx) => {
    const list = await resolveList(tx);
    if (!list) return null;
    const b = await buildBoard(tx, org.id, list);
    return { ...b, currentUserId: b.members[0]?.id ?? null };
  });
}

/** Card único (após create/update) para reconciliar o estado local do board. */
export async function getTaskCard(orgId: string, id: string): Promise<BoardTaskDTO | null> {
  return withOrg(orgId, async (tx) => {
    const t = await tx.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: { client: true, assignees: { with: { user: true } } },
    });
    if (!t) return null;
    const dto = toDTO(t);
    dto.commentCount = await tx.$count(
      comments,
      and(eq(comments.taskId, id), isNull(comments.deletedAt)),
    );
    dto.subtaskTotal = await tx.$count(
      tasks,
      and(eq(tasks.parentId, id), isNull(tasks.deletedAt)),
    );
    dto.subtaskDone = await tx.$count(
      tasks,
      and(eq(tasks.parentId, id), eq(tasks.completed, true), isNull(tasks.deletedAt)),
    );
    dto.attachmentCount = await tx.$count(attachments, eq(attachments.taskId, id));
    const blocker = alias(tasks, "blocker");
    const blockedRows = await tx
      .select({ id: taskDependencies.id })
      .from(taskDependencies)
      .innerJoin(blocker, eq(blocker.id, taskDependencies.blockerId))
      .where(
        and(
          eq(taskDependencies.blockedId, id),
          eq(blocker.completed, false),
          isNull(blocker.deletedAt),
        ),
      )
      .limit(1);
    dto.blocked = blockedRows.length > 0;
    const [timeRow] = await tx
      .select({
        seconds:
          sql<number>`coalesce(sum(extract(epoch from (coalesce(${timeEntries.endedAt}, now()) - ${timeEntries.startedAt}))), 0)`.mapWith(
            Number,
          ),
      })
      .from(timeEntries)
      .where(eq(timeEntries.taskId, id));
    dto.trackedSeconds = Math.round(timeRow?.seconds ?? 0);

    const defs = await tx.query.customFieldDefs.findMany({
      where: eq(customFieldDefs.listId, t.listId),
      orderBy: [asc(customFieldDefs.position), asc(customFieldDefs.createdAt)],
    });
    if (defs.length) {
      const vals = await tx
        .select({ fieldId: customFieldValues.fieldId, value: customFieldValues.value })
        .from(customFieldValues)
        .where(eq(customFieldValues.taskId, id));
      const valById = new Map(vals.map((v) => [v.fieldId, v.value]));
      dto.customFields = defs
        .map((d) => ({ name: d.name, type: d.type, value: valById.get(d.id) ?? "" }))
        .filter((f) => f.value !== "");
    }
    return dto;
  });
}

export interface NavList {
  id: string;
  name: string;
}
export interface NavSpace {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  lists: NavList[];
}

/** Spaces + Lists da org (para a navegação lateral). */
export async function getWorkspaceNav(orgId: string): Promise<NavSpace[]> {
  return withOrg(orgId, async (tx) => {
    const sp = await tx.query.spaces.findMany({
      where: isNull(spaces.deletedAt),
      orderBy: [asc(spaces.createdAt)],
    });
    const ls = await tx.query.lists.findMany({
      where: isNull(lists.deletedAt),
      orderBy: [asc(lists.createdAt)],
    });
    return sp.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      icon: s.icon,
      lists: ls.filter((l) => l.spaceId === s.id).map((l) => ({ id: l.id, name: l.name })),
    }));
  });
}
