import { and, eq, ilike, isNull } from "drizzle-orm";
import { withOrg } from "./client";
import { lists, spaces, tasks } from "./schema";
import { getUserByEmail, getUserOrgs } from "./queries/auth";

export interface DebugTaskRow {
  orgName: string;
  spaceName: string | null;
  listName: string;
  taskId: string;
  title: string;
  description: string | null;
  createdAt: string;
}

/**
 * Diagnóstico pontual: acha tarefas (por prefixo de título) em todas as orgs
 * de um usuário, sem precisar do orgId de antemão. Usado por /api/admin/debug
 * (uso único, removido depois).
 */
export async function debugFindTasks(email: string, q: string): Promise<DebugTaskRow[]> {
  const user = await getUserByEmail(email);
  if (!user) return [];
  const orgs = await getUserOrgs(user.id);

  const out: DebugTaskRow[] = [];
  for (const org of orgs) {
    const rows = await withOrg(org.id, (tx) =>
      tx
        .select({
          taskId: tasks.id,
          title: tasks.title,
          description: tasks.description,
          createdAt: tasks.createdAt,
          listName: lists.name,
          spaceName: spaces.name,
        })
        .from(tasks)
        .innerJoin(lists, eq(lists.id, tasks.listId))
        .leftJoin(spaces, eq(spaces.id, lists.spaceId))
        .where(and(ilike(tasks.title, `%${q}%`), isNull(tasks.deletedAt))),
    ).catch(() => []);
    for (const r of rows) {
      out.push({
        orgName: org.name,
        spaceName: r.spaceName,
        listName: r.listName,
        taskId: r.taskId,
        title: r.title,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
      });
    }
  }
  return out;
}

/** Exclui (soft) tarefas cujo título comece com `prefix`, em todas as orgs do email. */
export async function debugDeleteTasksByPrefix(email: string, prefix: string): Promise<number> {
  const user = await getUserByEmail(email);
  if (!user) return 0;
  const orgs = await getUserOrgs(user.id);

  let count = 0;
  for (const org of orgs) {
    const rows = await withOrg(org.id, (tx) =>
      tx
        .update(tasks)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(ilike(tasks.title, `${prefix}%`), isNull(tasks.deletedAt)))
        .returning({ id: tasks.id }),
    ).catch(() => []);
    count += rows.length;
  }
  return count;
}
