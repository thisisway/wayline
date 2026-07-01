import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../client";
import { statuses, taskAssignees, tasks } from "../schema";

type Priority = "urgent" | "high" | "normal" | "low";

export interface CreateTaskInput {
  statusId: string;
  title: string;
  priority: Priority;
  clientId: string | null;
  dueDate: Date | null;
  assigneeIds: string[];
}

export interface UpdateTaskInput extends CreateTaskInput {
  id: string;
}

/** Cria uma tarefa no fim da coluna (status), com responsáveis. Retorna o id. */
export async function createTask(input: CreateTaskInput): Promise<string> {
  const db = getDb();
  const status = await db.query.statuses.findFirst({ where: eq(statuses.id, input.statusId) });
  if (!status || !status.listId) throw new Error("status inválido");

  const position = await db.$count(
    tasks,
    and(eq(tasks.statusId, input.statusId), isNull(tasks.deletedAt)),
  );

  const [created] = await db
    .insert(tasks)
    .values({
      orgId: status.orgId,
      listId: status.listId,
      statusId: input.statusId,
      title: input.title,
      priority: input.priority,
      clientId: input.clientId,
      dueDate: input.dueDate,
      position,
    })
    .returning();
  if (!created) throw new Error("falha ao criar tarefa");

  if (input.assigneeIds.length > 0) {
    await db
      .insert(taskAssignees)
      .values(input.assigneeIds.map((userId) => ({ orgId: status.orgId, taskId: created.id, userId })));
  }
  return created.id;
}

/** Atualiza campos + responsáveis de uma tarefa (reconcilia assignees). */
export async function updateTask(input: UpdateTaskInput): Promise<void> {
  const db = getDb();
  const existing = await db.query.tasks.findFirst({ where: eq(tasks.id, input.id) });
  if (!existing) throw new Error("tarefa não encontrada");

  let position = existing.position;
  if (input.statusId !== existing.statusId) {
    position = await db.$count(
      tasks,
      and(eq(tasks.statusId, input.statusId), isNull(tasks.deletedAt)),
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({
        title: input.title,
        priority: input.priority,
        clientId: input.clientId,
        dueDate: input.dueDate,
        statusId: input.statusId,
        position,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, input.id));

    await tx.delete(taskAssignees).where(eq(taskAssignees.taskId, input.id));
    if (input.assigneeIds.length > 0) {
      await tx
        .insert(taskAssignees)
        .values(input.assigneeIds.map((userId) => ({ orgId: existing.orgId, taskId: input.id, userId })));
    }
  });
}

/** Soft delete — o board filtra por deleted_at IS NULL. */
export async function deleteTask(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(tasks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(tasks.id, id));
}

/** Nova ordem do board: para cada coluna (status), a sequência de task ids. */
export interface BoardOrderInput {
  statusId: string;
  taskIds: string[];
}

/**
 * Persiste a reordenação do board numa transação: cada task recebe o
 * `status_id` da sua coluna e a `position` = índice dentro dela.
 *
 * Determinístico — o client envia o estado final das colunas afetadas e o
 * servidor apenas o reconcilia (sem lógica de splice, sem race de índices).
 */
export async function saveBoardOrder(order: BoardOrderInput[]): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
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
