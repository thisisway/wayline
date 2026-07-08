import { asc, eq } from "drizzle-orm";
import { withOrg } from "../client";
import { statuses, tasks } from "../schema";

export interface StatusDTO {
  id: string;
  name: string;
  kind: "open" | "active" | "done";
  color: string;
  position: number;
}

/** Cria uma coluna no fim da lista (kind 'active', cor neutra). */
export async function createStatus(
  orgId: string,
  listId: string,
  name: string,
): Promise<StatusDTO> {
  return withOrg(orgId, async (tx) => {
    const count = await tx.$count(statuses, eq(statuses.listId, listId));
    const [row] = await tx
      .insert(statuses)
      .values({ orgId, listId, name: name.trim(), kind: "active", color: "#94A3B8", position: count })
      .returning();
    if (!row) throw new Error("falha ao criar coluna");
    return { id: row.id, name: row.name, kind: row.kind, color: row.color, position: row.position };
  });
}

export async function renameStatus(orgId: string, id: string, name: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.update(statuses).set({ name: name.trim() }).where(eq(statuses.id, id));
  });
}

export async function setStatusColor(orgId: string, id: string, color: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.update(statuses).set({ color }).where(eq(statuses.id, id));
  });
}

/** Define o tipo da coluna e sincroniza `completed` das tarefas dela. */
export async function setStatusKind(
  orgId: string,
  id: string,
  kind: "open" | "active" | "done",
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.update(statuses).set({ kind }).where(eq(statuses.id, id));
    await tx
      .update(tasks)
      .set({ completed: kind === "done", updatedAt: new Date() })
      .where(eq(tasks.statusId, id));
  });
}

/** Ao mover uma tarefa: marca `completed` conforme o tipo da coluna destino. */
export async function syncTaskCompleted(
  orgId: string,
  taskId: string,
  statusId: string,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    const status = await tx.query.statuses.findFirst({ where: eq(statuses.id, statusId) });
    if (!status) return;
    await tx
      .update(tasks)
      .set({ completed: status.kind === "done", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  });
}

/**
 * Exclui uma coluna: move as tarefas dela para a 1ª outra coluna da lista.
 * Não permite excluir a última coluna. Retorna true se excluiu.
 */
export async function deleteStatus(orgId: string, id: string): Promise<boolean> {
  return withOrg(orgId, async (tx) => {
    const col = await tx.query.statuses.findFirst({ where: eq(statuses.id, id) });
    if (!col?.listId) return false;
    const siblings = await tx.query.statuses.findMany({
      where: eq(statuses.listId, col.listId),
      orderBy: [asc(statuses.position)],
    });
    if (siblings.length <= 1) return false;
    const target = siblings.find((s) => s.id !== id)!;
    await tx.update(tasks).set({ statusId: target.id, updatedAt: new Date() }).where(eq(tasks.statusId, id));
    await tx.delete(statuses).where(eq(statuses.id, id));
    return true;
  });
}
