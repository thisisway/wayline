import { eq } from "drizzle-orm";
import { withOrg } from "../client";
import { taskAssignees } from "../schema";

export interface MyTask {
  id: string;
  title: string;
  listId: string;
  listName: string;
  statusName: string | null;
  statusColor: string | null;
  priority: "urgent" | "high" | "normal" | "low";
  dueDate: Date | null;
  clientName: string | null;
}

/** Tarefas atribuídas ao usuário na org (cross-list; exclui subtarefas). */
export async function getMyTasks(orgId: string, userId: string): Promise<MyTask[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.taskAssignees.findMany({
      where: eq(taskAssignees.userId, userId),
      with: { task: { with: { status: true, list: true, client: true } } },
    });

    const out: MyTask[] = [];
    for (const r of rows) {
      const t = r.task;
      if (!t || t.deletedAt || t.parentId) continue;
      out.push({
        id: t.id,
        title: t.title,
        listId: t.listId,
        listName: t.list?.name ?? "—",
        statusName: t.status?.name ?? null,
        statusColor: t.status?.color ?? null,
        priority: t.priority,
        dueDate: t.dueDate,
        clientName: t.client?.name ?? null,
      });
    }
    out.sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity));
    return out;
  });
}
