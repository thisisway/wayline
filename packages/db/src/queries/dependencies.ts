import { and, asc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { withOrg } from "../client";
import { statuses, taskDependencies, tasks } from "../schema";

/** Tarefa referenciada numa dependência (view mínima). */
export interface DependencyTaskDTO {
  /** id da linha em task_dependencies (para remover). */
  depId: string;
  taskId: string;
  title: string;
  completed: boolean;
  statusName: string | null;
}

export interface TaskDependencies {
  /** Tarefas que bloqueiam esta (esta depende delas). */
  blockedBy: DependencyTaskDTO[];
  /** Tarefas que esta bloqueia. */
  blocks: DependencyTaskDTO[];
}

/** Candidatas a virar dependência: demais tarefas de topo da mesma lista. */
export interface TaskOption {
  id: string;
  title: string;
}

export async function getTaskDependencies(
  orgId: string,
  taskId: string,
): Promise<TaskDependencies> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx
      .select({
        depId: taskDependencies.id,
        blockerId: taskDependencies.blockerId,
        blockedId: taskDependencies.blockedId,
      })
      .from(taskDependencies)
      .where(
        or(eq(taskDependencies.blockedId, taskId), eq(taskDependencies.blockerId, taskId)),
      );

    const otherIds = new Set<string>();
    for (const r of rows) {
      otherIds.add(r.blockerId === taskId ? r.blockedId : r.blockerId);
    }
    if (otherIds.size === 0) return { blockedBy: [], blocks: [] };

    const taskRows = await tx
      .select({
        id: tasks.id,
        title: tasks.title,
        completed: tasks.completed,
        statusName: statuses.name,
      })
      .from(tasks)
      .leftJoin(statuses, eq(statuses.id, tasks.statusId))
      .where(and(inArray(tasks.id, [...otherIds]), isNull(tasks.deletedAt)));
    const byId = new Map(taskRows.map((t) => [t.id, t]));

    const blockedBy: DependencyTaskDTO[] = [];
    const blocks: DependencyTaskDTO[] = [];
    for (const r of rows) {
      const isBlockedBy = r.blockedId === taskId; // outra tarefa bloqueia esta
      const otherId = isBlockedBy ? r.blockerId : r.blockedId;
      const t = byId.get(otherId);
      if (!t) continue; // tarefa removida (soft delete)
      const dto: DependencyTaskDTO = {
        depId: r.depId,
        taskId: t.id,
        title: t.title,
        completed: t.completed,
        statusName: t.statusName,
      };
      (isBlockedBy ? blockedBy : blocks).push(dto);
    }
    return { blockedBy, blocks };
  });
}

/** Outras tarefas de topo da mesma lista da tarefa (para o seletor). */
export async function getTaskOptions(orgId: string, taskId: string): Promise<TaskOption[]> {
  return withOrg(orgId, async (tx) => {
    const self = await tx.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!self) return [];
    const rows = await tx.query.tasks.findMany({
      where: and(
        eq(tasks.listId, self.listId),
        ne(tasks.id, taskId),
        isNull(tasks.parentId),
        isNull(tasks.deletedAt),
      ),
      orderBy: [asc(tasks.position)],
    });
    return rows.map((r) => ({ id: r.id, title: r.title }));
  });
}

export type AddDependencyResult =
  | { ok: true; dep: DependencyTaskDTO }
  | { ok: false; error: string };

/** Adiciona "blocker bloqueia blocked". Evita self, duplicata e ciclo direto. */
export async function addDependency(
  orgId: string,
  blockerId: string,
  blockedId: string,
): Promise<AddDependencyResult> {
  if (blockerId === blockedId) return { ok: false, error: "Uma tarefa não pode depender de si." };
  return withOrg(orgId, async (tx) => {
    // ciclo direto: já existe blocked bloqueia blocker?
    const reverse = await tx.query.taskDependencies.findFirst({
      where: and(
        eq(taskDependencies.blockerId, blockedId),
        eq(taskDependencies.blockedId, blockerId),
      ),
    });
    if (reverse) return { ok: false, error: "Isso criaria uma dependência circular." };

    const dup = await tx.query.taskDependencies.findFirst({
      where: and(
        eq(taskDependencies.blockerId, blockerId),
        eq(taskDependencies.blockedId, blockedId),
      ),
    });
    if (dup) return { ok: false, error: "Dependência já existe." };

    const [row] = await tx
      .insert(taskDependencies)
      .values({ orgId, blockerId, blockedId })
      .returning({ id: taskDependencies.id });
    if (!row) return { ok: false, error: "Falha ao salvar." };

    const blocker = await tx
      .select({
        id: tasks.id,
        title: tasks.title,
        completed: tasks.completed,
        statusName: statuses.name,
      })
      .from(tasks)
      .leftJoin(statuses, eq(statuses.id, tasks.statusId))
      .where(eq(tasks.id, blockerId));
    const b = blocker[0];
    return {
      ok: true,
      dep: {
        depId: row.id,
        taskId: blockerId,
        title: b?.title ?? "",
        completed: b?.completed ?? false,
        statusName: b?.statusName ?? null,
      },
    };
  });
}

export async function removeDependency(orgId: string, depId: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.delete(taskDependencies).where(eq(taskDependencies.id, depId));
  });
}
