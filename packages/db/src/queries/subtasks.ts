import { and, asc, eq, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { tasks } from "../schema";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

/** Subtarefas de uma tarefa (filhas via parent_id). */
export async function getSubtasks(orgId: string, parentId: string): Promise<Subtask[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.tasks.findMany({
      where: and(eq(tasks.parentId, parentId), isNull(tasks.deletedAt)),
      orderBy: [asc(tasks.position), asc(tasks.createdAt)],
    });
    return rows.map((r) => ({ id: r.id, title: r.title, completed: r.completed }));
  });
}

export async function createSubtask(
  orgId: string,
  parentId: string,
  title: string,
): Promise<Subtask> {
  return withOrg(orgId, async (tx) => {
    const parent = await tx.query.tasks.findFirst({ where: eq(tasks.id, parentId) });
    if (!parent) throw new Error("tarefa pai inválida");
    const [created] = await tx
      .insert(tasks)
      .values({ orgId, listId: parent.listId, parentId, title: title.trim() })
      .returning();
    if (!created) throw new Error("falha ao criar subtarefa");
    return { id: created.id, title: created.title, completed: created.completed };
  });
}

export async function setSubtaskDone(
  orgId: string,
  id: string,
  completed: boolean,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .update(tasks)
      .set({ completed, updatedAt: new Date() })
      .where(eq(tasks.id, id));
  });
}

export async function deleteSubtask(orgId: string, id: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, id));
  });
}
