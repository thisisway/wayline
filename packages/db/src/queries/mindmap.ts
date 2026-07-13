import { and, asc, eq, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { lists, statuses, tasks } from "../schema";

export interface MindMapNode {
  id: string;
  /** null = tarefa de topo (filha da raiz/lista); senão é subtarefa. */
  parentId: string | null;
  title: string;
  completed: boolean;
  priority: "urgent" | "high" | "normal" | "low";
  /** Nome/cor da coluna (só para tarefas de topo). */
  statusName: string | null;
  statusColor: string | null;
  isSubtask: boolean;
}

export interface ListMindMap {
  listId: string;
  listName: string;
  nodes: MindMapNode[];
}

/**
 * Mapa mental de uma lista: reaproveita a hierarquia tarefa → subtarefa.
 * Raiz (a lista) → tarefas de topo → subtarefas.
 */
export async function getListMindMap(
  orgId: string,
  listId: string,
): Promise<ListMindMap | null> {
  return withOrg(orgId, async (tx) => {
    const list = await tx.query.lists.findFirst({
      where: and(eq(lists.id, listId), isNull(lists.deletedAt)),
    });
    if (!list) return null;

    const rows = await tx.query.tasks.findMany({
      where: and(eq(tasks.listId, listId), isNull(tasks.deletedAt)),
      orderBy: [asc(tasks.position)],
    });
    const cols = await tx.query.statuses.findMany({
      where: eq(statuses.listId, listId),
    });
    const colById = new Map(cols.map((c) => [c.id, c]));

    const nodes: MindMapNode[] = rows.map((t) => {
      const col = !t.parentId && t.statusId ? colById.get(t.statusId) : undefined;
      return {
        id: t.id,
        parentId: t.parentId,
        title: t.title,
        completed: t.completed,
        priority: t.priority,
        statusName: col?.name ?? null,
        statusColor: col?.color ?? null,
        isSubtask: Boolean(t.parentId),
      };
    });

    return { listId: list.id, listName: list.name, nodes };
  });
}
