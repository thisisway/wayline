import { and, ilike, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { tasks } from "../schema";

export interface SearchResult {
  id: string;
  title: string;
  listId: string;
  listName: string;
  statusName: string | null;
  statusColor: string | null;
  priority: "urgent" | "high" | "normal" | "low";
}

/** Busca tarefas por título na org (exclui subtarefas e excluídas). */
export async function searchTasks(orgId: string, query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.tasks.findMany({
      where: and(ilike(tasks.title, `%${q}%`), isNull(tasks.parentId), isNull(tasks.deletedAt)),
      with: { status: true, list: true },
      limit: 20,
    });
    return rows.map((t) => ({
      id: t.id,
      title: t.title,
      listId: t.listId,
      listName: t.list?.name ?? "—",
      statusName: t.status?.name ?? null,
      statusColor: t.status?.color ?? null,
      priority: t.priority,
    }));
  });
}
