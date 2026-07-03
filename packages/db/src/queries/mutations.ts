import { and, eq, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { statuses, taskAssignees, tasks } from "../schema";

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

/** Soft delete — o board filtra por deleted_at IS NULL. */
export async function deleteTask(orgId: string, id: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, id));
  });
}
