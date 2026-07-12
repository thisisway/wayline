import { and, count, eq, isNull, sql } from "drizzle-orm";
import { withOrg } from "../client";
import { clients, taskAssignees, tasks, users } from "../schema";

/** Carga de trabalho de um membro (tarefas abertas atribuídas a ele). */
export interface DashboardMemberLoad {
  id: string;
  name: string;
  open: number;
  overdue: number;
}

/** Progresso de um cliente por contagem de tarefas (não por horas). */
export interface DashboardClientProgress {
  id: string;
  name: string;
  color: string | null;
  total: number;
  done: number;
}

export interface OrgDashboard {
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  /** Abertas em até 7 dias (não concluídas, ainda não atrasadas). */
  dueSoon: number;
  /** Abertas sem nenhum responsável. */
  unassignedOpen: number;
  /** Abertas por prioridade. */
  byPriority: { urgent: number; high: number; normal: number; low: number };
  memberLoad: DashboardMemberLoad[];
  clientProgress: DashboardClientProgress[];
}

/**
 * Agregados executivos da org (todas as listas), baseados em CONTAGEM de
 * tarefas — complementa o painel de Relatórios (que é baseado em horas).
 * Considera apenas tarefas de topo (sem subtarefas) e não excluídas.
 */
export async function getOrgDashboard(orgId: string): Promise<OrgDashboard> {
  const base = and(isNull(tasks.parentId), isNull(tasks.deletedAt));
  return withOrg(orgId, async (tx) => {
    const [summary] = await tx
      .select({
        open: sql<number>`count(*) filter (where not ${tasks.completed})`.mapWith(Number),
        completed: sql<number>`count(*) filter (where ${tasks.completed})`.mapWith(Number),
        overdue:
          sql<number>`count(*) filter (where ${tasks.dueDate} < now() and not ${tasks.completed})`.mapWith(
            Number,
          ),
        dueSoon:
          sql<number>`count(*) filter (where ${tasks.dueDate} >= now() and ${tasks.dueDate} < now() + interval '7 days' and not ${tasks.completed})`.mapWith(
            Number,
          ),
        unassigned:
          sql<number>`count(*) filter (where not ${tasks.completed} and not exists (select 1 from ${taskAssignees} where ${taskAssignees.taskId} = ${tasks.id}))`.mapWith(
            Number,
          ),
        pUrgent:
          sql<number>`count(*) filter (where not ${tasks.completed} and ${tasks.priority} = 'urgent')`.mapWith(
            Number,
          ),
        pHigh:
          sql<number>`count(*) filter (where not ${tasks.completed} and ${tasks.priority} = 'high')`.mapWith(
            Number,
          ),
        pNormal:
          sql<number>`count(*) filter (where not ${tasks.completed} and ${tasks.priority} = 'normal')`.mapWith(
            Number,
          ),
        pLow:
          sql<number>`count(*) filter (where not ${tasks.completed} and ${tasks.priority} = 'low')`.mapWith(
            Number,
          ),
      })
      .from(tasks)
      .where(base);

    const memberRows = await tx
      .select({
        id: users.id,
        name: users.name,
        open: sql<number>`count(*) filter (where not ${tasks.completed})`.mapWith(Number),
        overdue:
          sql<number>`count(*) filter (where ${tasks.dueDate} < now() and not ${tasks.completed})`.mapWith(
            Number,
          ),
      })
      .from(taskAssignees)
      .innerJoin(tasks, eq(tasks.id, taskAssignees.taskId))
      .innerJoin(users, eq(users.id, taskAssignees.userId))
      .where(base)
      .groupBy(users.id, users.name)
      .orderBy(sql`3 desc`);

    const clientRows = await tx
      .select({
        id: sql<string>`coalesce(${clients.id}::text, 'none')`,
        name: sql<string>`coalesce(${clients.name}, 'Sem cliente')`,
        color: clients.color,
        total: count(),
        done: sql<number>`count(*) filter (where ${tasks.completed})`.mapWith(Number),
      })
      .from(tasks)
      .leftJoin(clients, eq(clients.id, tasks.clientId))
      .where(base)
      .groupBy(clients.id, clients.name, clients.color)
      .orderBy(sql`4 desc`);

    return {
      openTasks: summary?.open ?? 0,
      completedTasks: summary?.completed ?? 0,
      overdueTasks: summary?.overdue ?? 0,
      dueSoon: summary?.dueSoon ?? 0,
      unassignedOpen: summary?.unassigned ?? 0,
      byPriority: {
        urgent: summary?.pUrgent ?? 0,
        high: summary?.pHigh ?? 0,
        normal: summary?.pNormal ?? 0,
        low: summary?.pLow ?? 0,
      },
      memberLoad: memberRows.filter((r) => r.open > 0),
      clientProgress: clientRows.filter((r) => r.total > 0),
    };
  });
}
