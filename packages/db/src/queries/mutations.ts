import { and, eq, inArray, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { activityLog, statuses, taskAssignees, tasks } from "../schema";

/** Nova ordem do board: para cada coluna (status), a sequência de task ids. */
export interface BoardOrderInput {
  statusId: string;
  taskIds: string[];
}

type Priority = "urgent" | "high" | "normal" | "low";

export interface CreateTaskInput {
  statusId: string;
  title: string;
  description: string | null;
  priority: Priority;
  clientId: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  assigneeIds: string[];
  tags: Array<{ label: string; color: string }>;
}

export interface UpdateTaskInput extends CreateTaskInput {
  id: string;
}

/**
 * Persiste a reordenação do board numa transação escopada por org (RLS):
 * cada task recebe o `status_id` da coluna e a `position` = índice.
 */
export async function saveBoardOrder(orgId: string, order: BoardOrderInput[]): Promise<void> {
  await withOrg(orgId, async (tx) => {
    for (const column of order) {
      for (let i = 0; i < column.taskIds.length; i++) {
        await tx
          .update(tasks)
          .set({ statusId: column.statusId, position: i, updatedAt: new Date() })
          .where(eq(tasks.id, column.taskIds[i]!));
      }
    }
  });
}

/**
 * Como `saveBoardOrder`, mas registra no histórico as tarefas que mudaram de
 * coluna (status) — usado quando a mudança vem de um drag no board.
 */
export async function saveBoardOrderLogged(
  orgId: string,
  order: BoardOrderInput[],
  actorId: string | null,
  actorName: string,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    const desired = new Map<string, string>();
    for (const col of order) for (const id of col.taskIds) desired.set(id, col.statusId);
    const ids = [...desired.keys()];
    if (ids.length === 0) return;

    const current = await tx
      .select({ id: tasks.id, statusId: tasks.statusId })
      .from(tasks)
      .where(inArray(tasks.id, ids));
    const curMap = new Map(current.map((r) => [r.id, r.statusId]));

    const changes = ids
      .map((id) => ({ taskId: id, from: curMap.get(id) ?? null, to: desired.get(id)! }))
      .filter((c) => c.from !== c.to);

    for (const column of order) {
      for (let i = 0; i < column.taskIds.length; i++) {
        await tx
          .update(tasks)
          .set({ statusId: column.statusId, position: i, updatedAt: new Date() })
          .where(eq(tasks.id, column.taskIds[i]!));
      }
    }

    if (changes.length > 0) {
      const statusIds = [
        ...new Set(changes.flatMap((c) => [c.from, c.to]).filter((x): x is string => !!x)),
      ];
      const names = statusIds.length
        ? await tx
            .select({ id: statuses.id, name: statuses.name })
            .from(statuses)
            .where(inArray(statuses.id, statusIds))
        : [];
      const nameOf = (id: string | null) =>
        (id && names.find((n) => n.id === id)?.name) || "—";
      await tx.insert(activityLog).values(
        changes.map((c) => ({
          orgId,
          taskId: c.taskId,
          actorId,
          actorName,
          action: "status",
          detail: `${nameOf(c.from)} → ${nameOf(c.to)}`,
        })),
      );
    }
  });
}

/** Cria uma tarefa no fim da coluna (status), com responsáveis. Retorna o id. */
export async function createTask(orgId: string, input: CreateTaskInput): Promise<string> {
  return withOrg(orgId, async (tx) => {
    const status = await tx.query.statuses.findFirst({ where: eq(statuses.id, input.statusId) });
    if (!status || !status.listId) throw new Error("status inválido");

    const position = await tx.$count(
      tasks,
      and(eq(tasks.statusId, input.statusId), isNull(tasks.deletedAt)),
    );

    const [created] = await tx
      .insert(tasks)
      .values({
        orgId,
        listId: status.listId,
        statusId: input.statusId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        clientId: input.clientId,
        startDate: input.startDate,
        dueDate: input.dueDate,
        tags: input.tags,
        position,
      })
      .returning();
    if (!created) throw new Error("falha ao criar tarefa");

    if (input.assigneeIds.length > 0) {
      await tx
        .insert(taskAssignees)
        .values(input.assigneeIds.map((userId) => ({ orgId, taskId: created.id, userId })));
    }
    return created.id;
  });
}

/** Atualiza campos + responsáveis de uma tarefa (reconcilia assignees). */
export async function updateTask(orgId: string, input: UpdateTaskInput): Promise<void> {
  await withOrg(orgId, async (tx) => {
    const existing = await tx.query.tasks.findFirst({ where: eq(tasks.id, input.id) });
    if (!existing) throw new Error("tarefa não encontrada");

    let position = existing.position;
    if (input.statusId !== existing.statusId) {
      position = await tx.$count(
        tasks,
        and(eq(tasks.statusId, input.statusId), isNull(tasks.deletedAt)),
      );
    }

    await tx
      .update(tasks)
      .set({
        title: input.title,
        description: input.description,
        priority: input.priority,
        clientId: input.clientId,
        startDate: input.startDate,
        dueDate: input.dueDate,
        statusId: input.statusId,
        tags: input.tags,
        position,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, input.id));

    await tx.delete(taskAssignees).where(eq(taskAssignees.taskId, input.id));
    if (input.assigneeIds.length > 0) {
      await tx
        .insert(taskAssignees)
        .values(input.assigneeIds.map((userId) => ({ orgId, taskId: input.id, userId })));
    }
  });
}

/** Duplica uma tarefa (campos + tags + responsáveis; não copia subtarefas/comentários). */
export async function duplicateTask(orgId: string, taskId: string): Promise<string> {
  return withOrg(orgId, async (tx) => {
    const src = await tx.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: { assignees: true },
    });
    if (!src) throw new Error("tarefa não encontrada");

    const position = src.statusId
      ? await tx.$count(tasks, and(eq(tasks.statusId, src.statusId), isNull(tasks.deletedAt)))
      : 0;

    const [created] = await tx
      .insert(tasks)
      .values({
        orgId,
        listId: src.listId,
        statusId: src.statusId,
        title: `${src.title} (cópia)`,
        description: src.description,
        priority: src.priority,
        clientId: src.clientId,
        startDate: src.startDate,
        dueDate: src.dueDate,
        tags: src.tags,
        position,
      })
      .returning();
    if (!created) throw new Error("falha ao duplicar tarefa");

    if (src.assignees.length > 0) {
      await tx
        .insert(taskAssignees)
        .values(src.assignees.map((a) => ({ orgId, taskId: created.id, userId: a.userId })));
    }
    return created.id;
  });
}

/** Soft delete — o board filtra por deleted_at IS NULL. */
export async function deleteTask(orgId: string, id: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, id));
  });
}
